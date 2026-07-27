import { createClient } from "@/lib/supabase/server";
import { getSpareBank1AccountsForOwner } from "@/lib/sparebank1/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const purpose = new URL(request.url).searchParams.get("purpose") === "transactions"
      ? "transactions"
      : "balances";

    const { data: membership } = await supabase
      .from("household_members")
      .select("owner_id, can_view_overview, can_view_transactions, allowed_bank_account_ids, allowed_balance_account_ids")
      .eq("member_user_id", user.id)
      .eq("invite_status", "accepted")
      .maybeSingle();

    // Users who are not accepted members of somebody else's household are owners
    // of their own bank connection and can see all of their own accounts.
    if (!membership?.owner_id) {
      const accounts = await getSpareBank1AccountsForOwner(user.id);
      return NextResponse.json({
        accounts: accounts.map((account) => ({ ...account, canViewBalance: true })),
      });
    }

    const balanceIds = Array.isArray(membership.allowed_balance_account_ids)
      ? membership.allowed_balance_account_ids.filter((id): id is string => typeof id === "string")
      : [];
    const transactionIds = Array.isArray(membership.allowed_bank_account_ids)
      ? membership.allowed_bank_account_ids.filter((id): id is string => typeof id === "string")
      : membership.allowed_bank_account_ids === null ? null : [];

    if (purpose === "balances" && (!membership.can_view_overview || balanceIds.length === 0)) {
      return NextResponse.json({ accounts: [] });
    }
    if (purpose === "transactions" && !membership.can_view_transactions) {
      return NextResponse.json({ accounts: [] });
    }
    if (purpose === "transactions" && Array.isArray(transactionIds) && transactionIds.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    const ownerAccounts = await getSpareBank1AccountsForOwner(membership.owner_id);
    const allowedAccounts = ownerAccounts.filter((account) => {
      if (purpose === "balances") return balanceIds.includes(account.id);
      return transactionIds === null || transactionIds.includes(account.id);
    });

    return NextResponse.json({
      accounts: allowedAccounts.map((account) => {
        const canViewBalance = balanceIds.includes(account.id);
        return {
          ...account,
          balance: canViewBalance ? account.balance : null,
          canViewBalance,
        };
      }),
    });
  } catch (error) {
    console.error("Accounts fetch error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
