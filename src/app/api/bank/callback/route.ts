import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const SB1_TOKEN_URL = "https://api-auth.sparebank1.no/oauth/token";
const SB1_CLIENT_ID = process.env.SB1_CLIENT_ID;
const SB1_CLIENT_SECRET = process.env.SB1_CLIENT_SECRET;
const CONFIGURED_SB1_REDIRECT_URI = process.env.SB1_REDIRECT_URI;

function getSb1RedirectUri(request: NextRequest) {
  if (CONFIGURED_SB1_REDIRECT_URI) return CONFIGURED_SB1_REDIRECT_URI;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${appUrl.replace(/\/$/, "")}/api/bank/callback`;

  return `${request.nextUrl.origin}/api/bank/callback`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Bank OAuth error:", error);
      return NextResponse.redirect(
        `${origin}/bank?error=bank_auth_denied`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${origin}/bank?error=no_auth_code`
      );
    }

    if (!SB1_CLIENT_ID || !SB1_CLIENT_SECRET) {
      console.error("SpareBank 1 credentials not configured");
      return NextResponse.redirect(
        `${origin}/bank?error=config_error`
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(SB1_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getSb1RedirectUri(request),
        client_id: SB1_CLIENT_ID,
        client_secret: SB1_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${origin}/bank?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();

    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Calculate token expiry (access token valid for 10 minutes)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 600));

    // Store or update the bank connection
    const { error: upsertError } = await supabase
      .from("bank_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "sparebank1",
          bank_name: "SpareBank 1",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt.toISOString(),
          status: "active",
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (upsertError) {
      console.error("Failed to store bank connection:", upsertError);
      return NextResponse.redirect(
        `${origin}/bank?error=storage_failed`
      );
    }

    return NextResponse.redirect(`${origin}/bank?connected=true`);
  } catch (error) {
    console.error("Bank callback error:", error);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(
      `${origin}/bank?error=callback_failed`
    );
  }
}
