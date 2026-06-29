import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabaseAdmin = createAdminClient();

    // Public invite lookup is intentionally done server-side with the service
    // role. RLS stays closed; we only return non-sensitive invite metadata.
    const { data: member, error } = await supabaseAdmin
      .from("household_members")
      .select("*, household:households(name)")
      .eq("invite_token", token)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (member.invite_status === "revoked") {
      return NextResponse.json({ error: "Invite has been revoked" }, { status: 410 });
    }

    if (member.invite_status === "accepted") {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
    }

    return NextResponse.json({
      invite: {
        id: member.id,
        household_name: (member.household as { name: string } | null)?.name ?? "Familie",
        invite_email: member.invite_email,
        permissions: {
          overview: member.can_view_overview,
          receipts: member.can_view_receipts,
          transactions: member.can_view_transactions,
          budget: member.can_view_budget,
          analytics: member.can_view_analytics,
          portfolio: member.can_view_portfolio,
        },
        allowed_bank_account_ids: member.allowed_bank_account_ids ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: member, error: fetchError } = await supabaseAdmin
      .from("household_members")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (member.invite_status !== "pending") {
      return NextResponse.json({ error: "Invite is no longer valid" }, { status: 409 });
    }

    const inviteEmail = normalizeEmail(member.invite_email);
    const userEmail = normalizeEmail(user.email);
    if (inviteEmail && inviteEmail !== userEmail) {
      return NextResponse.json(
        { error: "This invite is for a different email address" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("household_members")
      .update({
        member_user_id: user.id,
        invite_status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", member.id)
      .eq("invite_status", "pending");

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
