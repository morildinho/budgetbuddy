import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { email, permissions = {}, allowedBankAccountIds = null } = body;

    const allowedAccountIds = Array.isArray(allowedBankAccountIds)
      ? allowedBankAccountIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      : null;

    if (allowedAccountIds && allowedAccountIds.length > 0) {
      const { data: ownedAccounts, error: accountError } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("user_id", user.id)
        .in("id", allowedAccountIds);

      if (accountError) throw accountError;

      if ((ownedAccounts || []).length !== allowedAccountIds.length) {
        return NextResponse.json({ error: "Invalid bank account selection" }, { status: 400 });
      }
    }

    // Get or create household
    let { data: household } = await supabase
      .from("households")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!household) {
      const { data: newHousehold, error: createError } = await supabase
        .from("households")
        .insert({ owner_id: user.id, name: "Min familie" })
        .select()
        .single();
      if (createError) throw createError;
      household = newHousehold;
    }

    if (!household) {
      return NextResponse.json({ error: "Failed to get household" }, { status: 500 });
    }

    // Create invite
    const { data: member, error: inviteError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        owner_id: user.id,
        invite_email: email || null,
        invite_status: "pending",
        can_view_overview: true,
        can_view_receipts: permissions.receipts ?? false,
        can_view_transactions: permissions.transactions ?? false,
        can_view_budget: permissions.budget ?? false,
        can_view_analytics: permissions.analytics ?? false,
        can_view_portfolio: permissions.portfolio ?? false,
        allowed_bank_account_ids: permissions.transactions ? allowedAccountIds : null,
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
    const inviteLink = `${baseUrl}/invite/${member.invite_token}`;

    return NextResponse.json({ member, inviteLink });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("household_members")
      .update({ invite_status: "revoked" })
      .eq("id", memberId)
      .eq("owner_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
}
