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

function parseContent(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { ownerId, isOwner } = await getNoteOwnerId(supabase, user.id);
    const { data, error } = await supabase
      .from("overview_notes")
      .select("id, content, created_at, updated_at")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ notes: data || [], canEdit: isOwner });
  } catch (error) {
    console.error("Error fetching overview notes:", error);
    return NextResponse.json({ error: "Failed to fetch overview notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { isOwner } = await getNoteOwnerId(supabase, user.id);
    if (!isOwner) return NextResponse.json({ error: "Read-only household access" }, { status: 403 });

    const body = await request.json();
    const content = parseContent(body.content);
    if (!content) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });

    const { data, error } = await supabase
      .from("overview_notes")
      .insert({ user_id: user.id, content })
      .select("id, content, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating overview note:", error);
    return NextResponse.json({ error: "Failed to create overview note" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { isOwner } = await getNoteOwnerId(supabase, user.id);
    if (!isOwner) return NextResponse.json({ error: "Read-only household access" }, { status: 403 });

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const content = parseContent(body.content);
    if (!id || !content) return NextResponse.json({ error: "Missing note or content" }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });

    const { data, error } = await supabase
      .from("overview_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, content, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("Error updating overview note:", error);
    return NextResponse.json({ error: "Failed to update overview note" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { isOwner } = await getNoteOwnerId(supabase, user.id);
    if (!isOwner) return NextResponse.json({ error: "Read-only household access" }, { status: 403 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing note id" }, { status: 400 });

    const { error } = await supabase
      .from("overview_notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting overview note:", error);
    return NextResponse.json({ error: "Failed to delete overview note" }, { status: 500 });
  }
}
