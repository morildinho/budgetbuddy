import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user owns a household (full access)
    const { data: ownedHousehold } = await supabase
      .from("households")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (ownedHousehold) {
      return NextResponse.json({
        isOwner: true,
        canView: {
          overview: true,
          receipts: true,
          transactions: true,
          budget: true,
          analytics: true,
          portfolio: true,
        },
      });
    }

    // Check if user is a member of another household
    const { data: membership } = await supabase
      .from("household_members")
      .select("*")
      .eq("member_user_id", user.id)
      .eq("invite_status", "accepted")
      .single();

    if (membership) {
      return NextResponse.json({
        isOwner: false,
        canView: {
          overview: membership.can_view_overview,
          receipts: membership.can_view_receipts,
          transactions: membership.can_view_transactions,
          budget: membership.can_view_budget,
          analytics: membership.can_view_analytics,
          portfolio: membership.can_view_portfolio,
        },
      });
    }

    // Recovery path: if signup confirmation redirected to the dashboard instead of
    // the invite accept page, attach the user to a pending email-matched invite.
    const userEmail = user.email?.trim().toLowerCase();
    if (userEmail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createAdminClient();
      const { data: pendingInvite } = await supabaseAdmin
        .from("household_members")
        .select("*")
        .eq("invite_status", "pending")
        .ilike("invite_email", userEmail)
        .maybeSingle();

      if (pendingInvite) {
        const { data: acceptedInvite, error: acceptError } = await supabaseAdmin
          .from("household_members")
          .update({
            member_user_id: user.id,
            invite_status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", pendingInvite.id)
          .eq("invite_status", "pending")
          .select("*")
          .single();

        if (!acceptError && acceptedInvite) {
          return NextResponse.json({
            isOwner: false,
            canView: {
              overview: acceptedInvite.can_view_overview,
              receipts: acceptedInvite.can_view_receipts,
              transactions: acceptedInvite.can_view_transactions,
              budget: acceptedInvite.can_view_budget,
              analytics: acceptedInvite.can_view_analytics,
              portfolio: acceptedInvite.can_view_portfolio,
            },
          });
        }
      }
    }

    // User has no household affiliation — treat as owner with full access
    return NextResponse.json({
      isOwner: true,
      canView: {
        overview: true,
        receipts: true,
        transactions: true,
        budget: true,
        analytics: true,
        portfolio: true,
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
