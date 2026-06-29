import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the bank connection
    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "sparebank1")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No bank connection found. Please connect your bank first." },
        { status: 404 }
      );
    }

    let accessToken = connection.access_token;

    // Check if token is expired, try refresh
    const tokenExpiry = new Date(connection.token_expires_at);
    if (tokenExpiry <= new Date()) {
      if (!connection.refresh_token) {
        // Mark connection as expired
        await supabase
          .from("bank_connections")
          .update({ status: "expired" })
          .eq("id", connection.id);

        return NextResponse.json(
          { error: "Bank connection expired. Please reconnect." },
          { status: 401 }
        );
      }

      // Refresh the token
      const newTokens = await refreshAccessToken(connection.refresh_token);
      if (!newTokens) {
        await supabase
          .from("bank_connections")
          .update({ status: "expired" })
          .eq("id", connection.id);

        return NextResponse.json(
          { error: "Failed to refresh bank token. Please reconnect." },
          { status: 401 }
        );
      }

      // Update stored tokens
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

    // Step 1: Fetch all accounts from SB1
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
        { error: `Failed to fetch bank accounts (${accountsResponse.status})` },
        { status: 502 }
      );
    }

    const accountsData = await accountsResponse.json();
    const rawAccounts = Array.isArray(accountsData)
      ? accountsData
      : accountsData.accounts || accountsData.items || [];

    if (rawAccounts.length === 0) {
      return NextResponse.json(
        { error: "No bank accounts found" },
        { status: 404 }
      );
    }

    // Build date filter: if previously synced, only fetch from 7 days before last sync
    let fromDateParam = "";
    if (connection.last_synced_at) {
      const lastSync = new Date(connection.last_synced_at);
      lastSync.setDate(lastSync.getDate() - 7);
      fromDateParam = `&fromDate=${lastSync.toISOString().split("T")[0]}`;
    }

    // Step 2: For each account, fetch and store transactions
    let imported = 0;
    let skipped = 0;
    let totalFetched = 0;

    for (const account of rawAccounts) {
      const accountKey = account.key || account.accountKey || account.id;
      if (!accountKey) continue;

      const txnResponse = await fetch(
        `${SB1_API_URL}/personal/banking/transactions?accountKey=${encodeURIComponent(accountKey)}${fromDateParam}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.sparebank1.v1+json;charset=utf-8",
          },
        }
      );

      if (!txnResponse.ok) {
        console.error(`Failed to fetch transactions for account ${accountKey}:`, await txnResponse.text());
        continue;
      }

      const transactionsData = await txnResponse.json();
      const rawTransactions = Array.isArray(transactionsData)
        ? transactionsData
        : transactionsData.transactions || transactionsData.items || [];

      totalFetched += rawTransactions.length;

      for (const txn of rawTransactions) {
        // Prefer remoteId/transactionId over id — id is often session-specific
        const transactionId = txn.remoteId || txn.transactionId || txn.id || null;

        const normalizedTxn = {
          user_id: user.id,
          bank_account_id: accountKey,
          transaction_id: transactionId,
          source: "sparebank1",
          date: normalizeDate(txn.date || txn.bookingDate || txn.transactionDate),
          description: txn.description || txn.text || txn.message || "Ukjent transaksjon",
          amount: parseAmount(txn.amount || txn.value),
          raw_data: txn,
        };

        // Skip if no transaction_id (can't dedup)
        if (!normalizedTxn.transaction_id) {
          skipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from("bank_transactions")
          .upsert(normalizedTxn, {
            onConflict: "user_id,source,transaction_id",
            ignoreDuplicates: false,
          });

        if (insertError) {
          console.error("Failed to insert transaction:", insertError);
          skipped++;
        } else {
          imported++;
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from("bank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: totalFetched,
    });
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

function normalizeDate(dateValue: unknown): string {
  if (!dateValue) {
    return new Date().toISOString().split("T")[0];
  }
  // Handle numeric timestamps (epoch milliseconds)
  if (typeof dateValue === "number") {
    return new Date(dateValue).toISOString().split("T")[0];
  }
  // Handle non-string types
  if (typeof dateValue !== "string") {
    return new Date().toISOString().split("T")[0];
  }
  // Handle ISO format
  if (dateValue.includes("T")) {
    return dateValue.split("T")[0];
  }
  // Handle Norwegian DD.MM.YYYY format
  const norMatch = dateValue.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
  if (norMatch) {
    const day = norMatch[1];
    const month = norMatch[2];
    let year = norMatch[3];
    if (year.length === 2) {
      year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  // Already YYYY-MM-DD
  return dateValue;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Handle Norwegian decimal separator (comma)
    return parseFloat(value.replace(",", ".").replace(/\s/g, ""));
  }
  return 0;
}
