import { createAdminClient } from "@/lib/supabase/admin";

const SB1_API_URL = "https://api.sparebank1.no";
const SB1_TOKEN_URL = "https://api-auth.sparebank1.no/oauth/token";

export interface SafeSpareBank1Account {
  id: string;
  name: string;
  accountNumber: string | null;
  balance: number | null;
}

interface RefreshedTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const clientId = process.env.SB1_CLIENT_ID;
  const clientSecret = process.env.SB1_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("SpareBank1 client is not configured");

  const response = await fetch(SB1_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`SpareBank1 token refresh failed (${response.status})`);
  return response.json();
}

function lastFour(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s/g, "");
  return compact ? compact.slice(-4) : null;
}

function numericBalance(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return numericBalance(object.amount ?? object.value ?? object.booked);
  }
  return null;
}

export async function getSpareBank1AccountsForOwner(ownerId: string): Promise<SafeSpareBank1Account[]> {
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("bank_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("user_id", ownerId)
    .eq("provider", "sparebank1")
    .maybeSingle();

  if (error) throw error;
  if (!connection) return [];

  let accessToken = connection.access_token as string | null;
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  if (!accessToken || !expiresAt || expiresAt <= new Date()) {
    if (!connection.refresh_token) throw new Error("SpareBank1 connection has expired");
    const refreshed = await refreshAccessToken(connection.refresh_token);
    accessToken = refreshed.access_token;
    const nextExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const { error: updateError } = await admin
      .from("bank_connections")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || connection.refresh_token,
        token_expires_at: nextExpiry,
        status: "active",
      })
      .eq("id", connection.id)
      .eq("user_id", ownerId);
    if (updateError) throw updateError;
  }

  const response = await fetch(`${SB1_API_URL}/personal/banking/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.sparebank1.v1+json;charset=utf-8",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`SpareBank1 accounts request failed (${response.status})`);
  const payload = await response.json();
  const rawAccounts = Array.isArray(payload) ? payload : payload.accounts || payload.items || [];

  return rawAccounts.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== "object") return [];
    const account = raw as Record<string, unknown>;
    const id = account.key || account.accountKey || account.id;
    if (typeof id !== "string" || !id) return [];
    const accountNumber = lastFour(account.accountNumber);
    const explicitName = account.name || account.description;
    const name = typeof explicitName === "string" && explicitName.trim()
      ? explicitName.trim()
      : accountNumber ? `Konto •••• ${accountNumber}` : "Bankkonto";
    return [{
      id,
      name,
      accountNumber,
      balance: numericBalance(account.balance),
    }];
  });
}
