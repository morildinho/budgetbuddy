import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SB1_API_URL = "https://api.sparebank1.no";
const SB1_TOKEN_URL = "https://api-auth.sparebank1.no/oauth/token";
const SB1_CLIENT_ID = process.env.SB1_CLIENT_ID;
const SB1_CLIENT_SECRET = process.env.SB1_CLIENT_SECRET;

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  if (!SB1_CLIENT_ID || !SB1_CLIENT_SECRET) return null;

  const response = await fetch(SB1_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: SB1_CLIENT_ID,
      client_secret: SB1_CLIENT_SECRET,
    }),
  });

  if (!response.ok) return null;
  return response.json();
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "sparebank1")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No bank connection found." },
        { status: 404 }
      );
    }

    let accessToken = connection.access_token;

    // Check if token is expired, try refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    if (tokenExpiry <= new Date()) {
      if (!connection.refresh_token) {
        return NextResponse.json(
          { error: "Bank connection expired." },
          { status: 401 }
        );
      }

      const newTokens = await refreshAccessToken(connection.refresh_token);
      if (!newTokens) {
        return NextResponse.json(
          { error: "Failed to refresh bank token." },
          { status: 401 }
        );
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + newTokens.expires_in);

      await supabase
        .from("bank_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .eq("id", connection.id);

      accessToken = newTokens.access_token;
    }

    // Fetch all accounts from SB1
    const accountsResponse = await fetch(
      `${SB1_API_URL}/personal/banking/accounts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.sparebank1.v1+json;charset=utf-8",
        },
      }
    );

    if (!accountsResponse.ok) {
      const errText = await accountsResponse.text();
      console.error("Failed to fetch accounts:", accountsResponse.status, errText);
      return NextResponse.json(
        { error: `Failed to fetch accounts (${accountsResponse.status})` },
        { status: 502 }
      );
    }

    const accountsData = await accountsResponse.json();

    // Normalize — the API may return an array or an object with an accounts field
    const rawAccounts = Array.isArray(accountsData)
      ? accountsData
      : accountsData.accounts || accountsData.items || [];

    const accounts = rawAccounts.map((acc: Record<string, unknown>) => ({
      id: acc.key || acc.accountKey || acc.id,
      name: acc.name || acc.description || acc.accountNumber || "Ukjent konto",
      accountNumber: acc.accountNumber || null,
      balance: typeof acc.balance === "number" ? acc.balance : null,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
