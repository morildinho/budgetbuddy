import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  TINK_LOCALE,
  TINK_MARKET,
  createLinkAuthorizationCode,
  getOrCreateTinkConnection,
} from "../_utils/tink";

const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID;
const CONFIGURED_TINK_REDIRECT_URI = process.env.TINK_REDIRECT_URI;

function getTinkRedirectUri(request: NextRequest) {
  if (CONFIGURED_TINK_REDIRECT_URI) return CONFIGURED_TINK_REDIRECT_URI;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${appUrl.replace(/\/$/, "")}/api/bank/tink/callback`;

  return `${request.nextUrl.origin}/api/bank/tink/callback`;
}

export async function GET(request: NextRequest) {
  try {
    if (!TINK_CLIENT_ID) {
      return NextResponse.json(
        { error: "Tink client ID ikke konfigurert" },
        { status: 500 }
      );
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

    const redirectUri = getTinkRedirectUri(request);
    const params = new URLSearchParams({
      client_id: TINK_CLIENT_ID,
      redirect_uri: redirectUri,
      authorization_code: authorizationCode,
      market: TINK_MARKET,
      locale: TINK_LOCALE,
      state,
    });

    const authUrl = `https://link.tink.com/1.0/transactions/connect-accounts?${params.toString()}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Tink link error:", error);
    const message = error instanceof Error ? error.message : "Kunne ikke generere Tink-lenke";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
