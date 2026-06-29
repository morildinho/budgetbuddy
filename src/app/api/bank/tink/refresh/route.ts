import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureFreshToken } from "../_utils/tokenHelper";
import {
  syncTinkAccounts,
  syncTransactionsForDbAccount,
  TinkConnectionRecord,
} from "../_utils/tink";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "tink")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: "Ingen aktiv Tink-tilkobling" }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await ensureFreshToken(supabase, connection as TinkConnectionRecord);
    } catch (tokenError) {
      console.error("Failed to refresh Tink user token:", tokenError);
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    const refreshed = { accounts: 0, transactions: 0 };

    const { count, accountIdMap } = await syncTinkAccounts(
      supabase,
      user.id,
      connection.id,
      accessToken
    );

    refreshed.accounts = count;

    for (const [tinkAccountId, dbAccountId] of Object.entries(accountIdMap)) {
      try {
        refreshed.transactions += await syncTransactionsForDbAccount(
          supabase,
          user.id,
          dbAccountId,
          tinkAccountId,
          accessToken
        );
      } catch (txnError) {
        console.warn(`Failed to refresh transactions for Tink account ${tinkAccountId}:`, txnError);
      }
    }

    return NextResponse.json({
      success: true,
      refreshed,
      message: `Oppdatert ${refreshed.accounts} kontoer og ${refreshed.transactions} transaksjoner`,
    });
  } catch (err) {
    console.error("Tink refresh error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
