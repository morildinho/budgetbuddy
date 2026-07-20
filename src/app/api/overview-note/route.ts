import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function getNoteOwnerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ownerId: string; isOwner: boolean }> {
  const { data: membership } = await supabase
    .from("household_members")
    .select("owner_id")
    .eq("member_user_id", userId)
    .eq("invite_status", "accepted")
    .maybeSingle();

  return membership?.owner_id
    ? { ownerId: membership.owner_id, isOwner: false }
    : { ownerId: userId, isOwner: true };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { ownerId, isOwner } = await getNoteOwnerId(supabase, user.id);
    const { data, error } = await supabase
      .from("overview_notes")
      .select("content, updated_at")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({
      note: data?.content || "",
      updatedAt: data?.updated_at || null,
      canEdit: isOwner,
    });
  } catch (error) {
    console.error("Error fetching overview note:", error);
    return NextResponse.json({ error: "Failed to fetch overview note" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { isOwner } = await getNoteOwnerId(supabase, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Household members have read-only access" }, { status: 403 });
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length > 4000) {
      return NextResponse.json({ error: "Note is too long" }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("overview_notes")
      .upsert({ user_id: user.id, content, updated_at: updatedAt }, { onConflict: "user_id" })
      .select("content, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data.content, updatedAt: data.updated_at });
  } catch (error) {
    console.error("Error saving overview note:", error);
    return NextResponse.json({ error: "Failed to save overview note" }, { status: 500 });
  }
}
