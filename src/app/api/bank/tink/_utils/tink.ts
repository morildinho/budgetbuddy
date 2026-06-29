import { createClient } from "@/lib/supabase/server";

const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID;
const TINK_CLIENT_SECRET = process.env.TINK_CLIENT_SECRET;

const TINK_OAUTH_TOKEN_URL = "https://api.tink.com/api/v1/oauth/token";
const TINK_USER_CREATE_URL = "https://api.tink.com/api/v1/user/create";
const TINK_AUTHORIZATION_GRANT_URL = "https://api.tink.com/api/v1/oauth/authorization-grant";
const TINK_AUTHORIZATION_GRANT_DELEGATE_URL =
  "https://api.tink.com/api/v1/oauth/authorization-grant/delegate";
const TINK_ACCOUNTS_URL = "https://api.tink.com/data/v2/accounts";
const TINK_TRANSACTIONS_URL = "https://api.tink.com/data/v2/transactions";
const TINK_LINK_DELEGATE_CLIENT_ID = "df05e4b379934cd09963197cc855bfe9";

export const TINK_MARKET = "NO";
export const TINK_LOCALE = "no_NO";
export const TINK_USER_SCOPES = [
  "accounts:read",
  "balances:read",
  "transactions:read",
  "provider-consents:read",
  "credentials:read",
] as const;

const TINK_LINK_SCOPES = [
  "authorization:read",
  "authorization:grant",
  "credentials:refresh",
  "credentials:read",
  "credentials:write",
  "providers:read",
  "user:read",
] as const;

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface TinkConnectionRecord {
  id: string;
  user_id: string;
  provider: string;
  tink_user_id: string | null;
  tink_credentials_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
}

interface TinkClientTokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface TinkAuthorizationGrantResponse {
  code: string;
}

interface TinkUserCreateResponse {
  user_id: string;
}

interface TinkUserTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface TinkAccount {
  id: string;
  name: string;
  type?: string;
  identifiers?: {
    iban?: { iban: string };
  };
  balances?: {
    booked?: {
      amount?: {
        value?: { unscaledValue: number; scale: number };
        currencyCode: string;
      };
    };
  };
}

export interface TinkTransaction {
  id: string;
  amount: {
    value: { unscaledValue: number; scale: number };
    currencyCode: string;
  };
  descriptions?: { display?: string; original?: string };
  dates?: { booked?: string; value?: string };
  categories?: { pfm?: { id: string; name: string } };
  status?: string;
}

interface TinkAccountsResponse {
  accounts: TinkAccount[];
}

interface TinkTransactionsResponse {
  transactions: TinkTransaction[];
  nextPageToken?: string;
}

function assertTinkConfig() {
  if (!TINK_CLIENT_ID || !TINK_CLIENT_SECRET) {
    throw new Error("Tink credentials not configured");
  }
}

async function readErrorBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "Unknown Tink error";
  }
}

export function parseAmount(value?: { unscaledValue: number; scale: number }): number | null {
  if (!value) return null;
  return value.unscaledValue / Math.pow(10, value.scale);
}

export async function getClientAccessToken(scopes: string[]): Promise<string> {
  assertTinkConfig();

  const response = await fetch(TINK_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: TINK_CLIENT_ID!,
      client_secret: TINK_CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope: scopes.join(","),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Tink client token: ${await readErrorBody(response)}`);
  }

  const data: TinkClientTokenResponse = await response.json();
  return data.access_token;
}

export async function createTinkUser(): Promise<string> {
  const clientToken = await getClientAccessToken(["user:create"]);

  const response = await fetch(TINK_USER_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      market: TINK_MARKET,
      locale: TINK_LOCALE,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Tink user: ${await readErrorBody(response)}`);
  }

  const data: TinkUserCreateResponse = await response.json();
  return data.user_id;
}

export async function createUserAuthorizationCode(tinkUserId: string): Promise<string> {
  const clientToken = await getClientAccessToken(["authorization:grant"]);

  const response = await fetch(TINK_AUTHORIZATION_GRANT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      user_id: tinkUserId,
      scope: TINK_USER_SCOPES.join(","),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Tink authorization grant: ${await readErrorBody(response)}`);
  }

  const data: TinkAuthorizationGrantResponse = await response.json();
  return data.code;
}

export async function createLinkAuthorizationCode(tinkUserId: string): Promise<string> {
  const clientToken = await getClientAccessToken(["authorization:grant", "user:read"]);

  const response = await fetch(TINK_AUTHORIZATION_GRANT_DELEGATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      response_type: "code",
      user_id: tinkUserId,
      id_hint: "BudgetBuddy",
      actor_client_id: TINK_LINK_DELEGATE_CLIENT_ID,
      scope: TINK_LINK_SCOPES.join(","),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create delegated Tink Link authorization grant: ${await readErrorBody(response)}`
    );
  }

  const data: TinkAuthorizationGrantResponse = await response.json();
  return data.code;
}

export async function exchangeAuthorizationCodeForUserToken(code: string): Promise<TinkUserTokenResponse> {
  assertTinkConfig();

  const response = await fetch(TINK_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: TINK_CLIENT_ID!,
      client_secret: TINK_CLIENT_SECRET!,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Tink authorization code: ${await readErrorBody(response)}`);
  }

  return response.json();
}

export async function getOrCreateTinkConnection(
  supabase: SupabaseServerClient,
  budgetBuddyUserId: string
): Promise<TinkConnectionRecord> {
  const { data: existing } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", budgetBuddyUserId)
    .eq("provider", "tink")
    .maybeSingle();

  if (existing?.tink_user_id) {
    return existing as TinkConnectionRecord;
  }

  const tinkUserId = await createTinkUser();
  const now = new Date().toISOString();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("bank_connections")
      .update({
        tink_user_id: tinkUserId,
        status: existing.status === "active" ? "active" : "pending",
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to store Tink user ID: ${error?.message || "unknown error"}`);
    }

    return updated as TinkConnectionRecord;
  }

  const { data: inserted, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: budgetBuddyUserId,
      provider: "tink",
      tink_user_id: tinkUserId,
      status: "pending",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to create Tink connection: ${error?.message || "unknown error"}`);
  }

  return inserted as TinkConnectionRecord;
}

export async function issueFreshUserToken(
  supabase: SupabaseServerClient,
  connection: Pick<TinkConnectionRecord, "id" | "tink_user_id">
): Promise<string> {
  if (!connection.tink_user_id) {
    throw new Error("Tink user ID mangler");
  }

  const authorizationCode = await createUserAuthorizationCode(connection.tink_user_id);
  const tokenData = await exchangeAuthorizationCodeForUserToken(authorizationCode);

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 7200));

  const { error } = await supabase
    .from("bank_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (error) {
    throw new Error(`Failed to save Tink user token: ${error.message}`);
  }

  return tokenData.access_token;
}

export async function fetchTinkAccounts(accessToken: string): Promise<TinkAccount[]> {
  const response = await fetch(TINK_ACCOUNTS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Tink accounts: ${await readErrorBody(response)}`);
  }

  const data: TinkAccountsResponse = await response.json();
  return data.accounts || [];
}

export async function syncTinkAccounts(
  supabase: SupabaseServerClient,
  budgetBuddyUserId: string,
  connectionId: string,
  accessToken: string
): Promise<{ count: number; accountIdMap: Record<string, string> }> {
  const accounts = await fetchTinkAccounts(accessToken);
  const accountIdMap: Record<string, string> = {};

  for (const account of accounts) {
    const balance = parseAmount(account.balances?.booked?.amount?.value);
    const currency = account.balances?.booked?.amount?.currencyCode || "NOK";
    const iban = account.identifiers?.iban?.iban || null;

    const { data: saved, error } = await supabase
      .from("bank_accounts")
      .upsert(
        {
          user_id: budgetBuddyUserId,
          connection_id: connectionId,
          tink_account_id: account.id,
          name: account.name,
          iban,
          type: account.type || null,
          balance_amount: balance,
          balance_currency: currency,
          last_refreshed_at: new Date().toISOString(),
        },
        { onConflict: "tink_account_id" }
      )
      .select("id, tink_account_id")
      .single();

    if (error) {
      throw new Error(`Failed to upsert Tink account: ${error.message}`);
    }

    accountIdMap[account.id] = saved.id;
  }

  return { count: accounts.length, accountIdMap };
}

export async function fetchAllTinkTransactions(
  accessToken: string,
  tinkAccountId: string
): Promise<TinkTransaction[]> {
  let nextPageToken: string | undefined;
  const allTransactions: TinkTransaction[] = [];

  do {
    const url = new URL(TINK_TRANSACTIONS_URL);
    url.searchParams.set("accountIdIn", tinkAccountId);
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Tink transactions: ${await readErrorBody(response)}`);
    }

    const data: TinkTransactionsResponse = await response.json();
    allTransactions.push(...(data.transactions || []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return allTransactions;
}

export async function syncTransactionsForDbAccount(
  supabase: SupabaseServerClient,
  budgetBuddyUserId: string,
  dbAccountId: string,
  tinkAccountId: string,
  accessToken: string
): Promise<number> {
  const transactions = await fetchAllTinkTransactions(accessToken, tinkAccountId);

  if (transactions.length > 0) {
    const rows = transactions.map((transaction) => ({
      user_id: budgetBuddyUserId,
      account_id: dbAccountId,
      tink_transaction_id: transaction.id,
      amount: parseAmount(transaction.amount.value) ?? 0,
      currency: transaction.amount.currencyCode || "NOK",
      description: transaction.descriptions?.display || transaction.descriptions?.original || "",
      date:
        transaction.dates?.booked ||
        transaction.dates?.value ||
        new Date().toISOString().split("T")[0],
      category: transaction.categories?.pfm?.name || null,
      status: transaction.status || "BOOKED",
      raw_data: transaction,
    }));

    const { error } = await supabase
      .from("bank_transactions")
      .upsert(rows, { onConflict: "tink_transaction_id" });

    if (error) {
      throw new Error(`Failed to upsert Tink transactions: ${error.message}`);
    }
  }

  await supabase
    .from("bank_accounts")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", dbAccountId);

  return transactions.length;
}
