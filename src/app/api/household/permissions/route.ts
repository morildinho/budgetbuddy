import { createClient } from "@/lib/supabase/server";
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
