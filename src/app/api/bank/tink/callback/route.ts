import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureFreshToken } from "../_utils/tokenHelper";
import { syncTinkAccounts, syncTransactionsForDbAccount } from "../_utils/tink";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const error = searchParams.get("error");
  const credentialsId =
    searchParams.get("credentials_id") ??
    searchParams.get("credentialsId");

  const cookieStore = await cookies();
  const stateFromCookie = cookieStore.get("tink_oauth_state")?.value;
  const stateFromParam = searchParams.get("state");
  if (!stateFromCookie || stateFromCookie !== stateFromParam) {
    return NextResponse.redirect(`${origin}/bank?error=invalid_state`);
  }
  cookieStore.delete("tink_oauth_state");

  if (error) {
    console.error("Tink OAuth error:", error, searchParams.get("message"));
    return NextResponse.redirect(`${origin}/bank?error=auth_denied`);
  }

  if (!credentialsId) {
    return NextResponse.redirect(`${origin}/bank?error=no_credentials`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "tink")
      .single();

    if (connectionError || !connection) {
      console.error("Failed to load Tink connection in callback:", connectionError);
      return NextResponse.redirect(`${origin}/bank?error=save_failed`);
    }

    // Continuous-access Tink Link returns credentials_id only. We mint a fresh
    // user token from the stored Tink user and then sync accounts with that token.
    const accessToken = await ensureFreshToken(supabase, connection);

    const { error: updateError } = await supabase
      .from("bank_connections")
      .update({
        tink_credentials_id: credentialsId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    if (updateError) {
      console.error("Failed to update Tink credentials ID:", updateError);
      return NextResponse.redirect(`${origin}/bank?error=save_failed`);
    }

    try {
      const { accountIdMap } = await syncTinkAccounts(
        supabase,
        user.id,
        connection.id,
        accessToken
      );

      for (const [tinkAccountId, dbAccountId] of Object.entries(accountIdMap)) {
        await syncTransactionsForDbAccount(
          supabase,
          user.id,
          dbAccountId,
          tinkAccountId,
          accessToken
        );
      }
    } catch (syncError) {
      console.error("Could not sync Tink accounts after callback:", syncError);
      return NextResponse.redirect(`${origin}/bank?error=sync_failed`);
    }

    return NextResponse.redirect(`${origin}/bank?connected=true`);
  } catch (err) {
    console.error("Tink callback error:", err);
    return NextResponse.redirect(`${origin}/bank?error=callback_failed`);
  }
}
