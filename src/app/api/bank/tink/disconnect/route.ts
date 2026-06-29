import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get("account_id");
    if (!accountId) {
      return NextResponse.json(
        { error: "Mangler account_id" },
        { status: 400 }
      );
    }

    // Verify the account belongs to this user
    const { data: account, error: accountError } = await supabase
      .from("bank_accounts")
      .select("id, connection_id, user_id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Konto ikke funnet" },
        { status: 404 }
      );
    }

    const connectionId = account.connection_id;

    // 1. Delete all transactions for this account
    const { error: txnError } = await supabase
      .from("bank_transactions")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", user.id);

    if (txnError) {
      console.error("Failed to delete transactions:", txnError);
      return NextResponse.json(
        { error: "Kunne ikke slette transaksjoner" },
        { status: 500 }
      );
    }

    // 2. Delete the account
    const { error: accError } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (accError) {
      console.error("Failed to delete account:", accError);
      return NextResponse.json(
        { error: "Kunne ikke slette konto" },
        { status: 500 }
      );
    }

    // 3. Check if connection has any remaining accounts
    const { data: remainingAccounts } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("user_id", user.id);

    if (!remainingAccounts || remainingAccounts.length === 0) {
      // No more accounts — delete the connection too
      await supabase
        .from("bank_connections")
        .delete()
        .eq("id", connectionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Disconnect error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
