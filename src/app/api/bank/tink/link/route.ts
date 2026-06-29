import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  TINK_LOCALE,
  TINK_MARKET,
  createLinkAuthorizationCode,
  getOrCreateTinkConnection,
} from "../_utils/tink";

const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID;
const TINK_REDIRECT_URI = process.env.TINK_REDIRECT_URI;

export async function GET() {
  try {
    if (!TINK_CLIENT_ID) {
      return NextResponse.json(
        { error: "Tink client ID ikke konfigurert" },
        { status: 500 }
      );
    }

    if (!TINK_REDIRECT_URI) {
      throw new Error("TINK_REDIRECT_URI is not configured");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("household_members")
      .select("id")
      .eq("member_user_id", user.id)
      .eq("invite_status", "accepted")
      .maybeSingle();

    if (membership) {
      return NextResponse.json(
        { error: "Gjestebrukere kan ikke koble til bankkontoer ennå" },
        { status: 403 }
      );
    }

    const connection = await getOrCreateTinkConnection(supabase, user.id);
    const authorizationCode = await createLinkAuthorizationCode(connection.tink_user_id!);

    const state = randomBytes(32).toString("hex");
    (await cookies()).set("tink_oauth_state", state, {
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    const params = new URLSearchParams({
      client_id: TINK_CLIENT_ID,
      redirect_uri: TINK_REDIRECT_URI,
      authorization_code: authorizationCode,
      market: TINK_MARKET,
      locale: TINK_LOCALE,
      state,
    });

    const authUrl = `https://link.tink.com/1.0/transactions/connect-accounts?${params.toString()}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Tink link error:", error);
    return NextResponse.json(
      { error: "Kunne ikke generere Tink-lenke" },
      { status: 500 }
    );
  }
}
