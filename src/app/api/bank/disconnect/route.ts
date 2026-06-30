import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error: txnError } = await supabase
      .from("bank_transactions")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "sparebank1");

    if (txnError) {
      console.error("Failed to delete SpareBank 1 transactions:", txnError);
      return NextResponse.json({ error: "Failed to delete transactions" }, { status: 500 });
    }

    const { error: connectionError } = await supabase
      .from("bank_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "sparebank1");

    if (connectionError) {
      console.error("Failed to delete SpareBank 1 connection:", connectionError);
      return NextResponse.json({ error: "Failed to disconnect bank" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SpareBank 1 disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect bank" }, { status: 500 });
  }
}
