import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureFreshToken } from "../_utils/tokenHelper";
import { syncTransactionsForDbAccount, TinkConnectionRecord } from "../_utils/tink";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    if (!accountId) {
      return NextResponse.json({ error: "account_id er påkrevd" }, { status: 400 });
    }

    // RLS decides whether the current user can see this account. Owners may
    // refresh from Tink; invited members only receive cached transactions.
    const { data: account, error: accError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accError || !account) {
      return NextResponse.json({ error: "Konto ikke funnet" }, { status: 404 });
    }

    const isAccountOwner = account.user_id === user.id;

    const loadCachedTransactions = async (extra: Record<string, unknown> = {}) => {
      const { data: cached, error: cachedError } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("account_id", accountId)
        .order("date", { ascending: false });

      if (cachedError) {
        console.error("Failed to load cached Tink transactions:", cachedError);
        return NextResponse.json({ error: "Kunne ikke hente transaksjoner" }, { status: 500 });
      }

      return NextResponse.json({ transactions: cached || [], cached: true, ...extra });
    };

    if (!isAccountOwner) {
      return loadCachedTransactions({ shared: true });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastRefreshed = account.last_refreshed_at ? new Date(account.last_refreshed_at) : null;
    const useCached = lastRefreshed && lastRefreshed > oneHourAgo;

    if (useCached) {
      return loadCachedTransactions();
    }

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("id", account.connection_id)
      .eq("user_id", user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: "Ingen gyldig banktilkobling" }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await ensureFreshToken(supabase, connection as TinkConnectionRecord);
    } catch (tokenError) {
      console.error("Failed to mint fresh Tink token:", tokenError);
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    try {
      await syncTransactionsForDbAccount(
        supabase,
        user.id,
        accountId,
        account.tink_account_id,
        accessToken
      );
    } catch (fetchError) {
      console.error("Tink transactions fetch failed:", fetchError);
      return loadCachedTransactions({ fetchError: true });
    }

    const { data: transactions, error: transactionsError } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("date", { ascending: false });

    if (transactionsError) {
      console.error("Failed to reload Tink transactions:", transactionsError);
      return NextResponse.json({ error: "Kunne ikke hente transaksjoner" }, { status: 500 });
    }

    return NextResponse.json({ transactions: transactions || [], cached: false });
  } catch (err) {
    console.error("Tink transactions error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
