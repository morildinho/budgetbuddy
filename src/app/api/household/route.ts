import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get household owned by user
    const { data: ownedHousehold } = await supabase
      .from("households")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    // Get members of owned household
    let members: unknown[] = [];
    if (ownedHousehold) {
      const { data: membersData } = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", ownedHousehold.id)
        .order("created_at", { ascending: false });
      members = membersData || [];
    }

    // Get memberships where user is the member (not the owner)
    const { data: myMemberships } = await supabase
      .from("household_members")
      .select("*")
      .eq("member_user_id", user.id)
      .eq("invite_status", "accepted");

    return NextResponse.json({
      household: ownedHousehold || null,
      members,
      myMemberships: myMemberships || [],
    });
  } catch (error) {
    console.error("Error fetching household:", error);
    return NextResponse.json({ error: "Failed to fetch household" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name || "Min familie";

    // Check if user already has a household
    const { data: existing } = await supabase
      .from("households")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (existing) {
      // Update name instead
      const { data, error } = await supabase
        .from("households")
        .update({ name })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ household: data });
    }

    const { data, error } = await supabase
      .from("households")
      .insert({ owner_id: user.id, name })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ household: data });
  } catch (error) {
    console.error("Error creating household:", error);
    return NextResponse.json({ error: "Failed to create household" }, { status: 500 });
  }
}
