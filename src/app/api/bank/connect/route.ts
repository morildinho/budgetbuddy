import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const SB1_AUTH_URL = "https://api-auth.sparebank1.no/oauth/authorize";
const SB1_CLIENT_ID = process.env.SB1_CLIENT_ID;
const SB1_REDIRECT_URI = process.env.SB1_REDIRECT_URI || "http://localhost:3000/api/bank/callback";
const SB1_FIN_INST = process.env.SB1_FIN_INST; // Optional: financial institution code

export async function GET() {
  try {
    if (!SB1_CLIENT_ID) {
      return NextResponse.json(
        { error: "SpareBank 1 client ID not configured" },
        { status: 500 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: membership } = await supabase
      .from("household_members")
      .select("id")
      .eq("member_user_id", user.id)
      .eq("invite_status", "accepted")
      .maybeSingle();

    if (membership) {
      return NextResponse.json(
        { error: "Guest users cannot connect bank accounts yet" },
        { status: 403 }
      );
    }

    // Generate state parameter to prevent CSRF
    const state = uuidv4();

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: SB1_CLIENT_ID,
      redirect_uri: SB1_REDIRECT_URI,
      response_type: "code",
      state,
    });

    // Optionally specify the financial institution
    if (SB1_FIN_INST) {
      params.set("finInst", SB1_FIN_INST);
    }

    const authUrl = `${SB1_AUTH_URL}?${params.toString()}`;

    return NextResponse.json({ url: authUrl, state });
  } catch (error) {
    console.error("Bank connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate bank connection" },
      { status: 500 }
    );
  }
}
