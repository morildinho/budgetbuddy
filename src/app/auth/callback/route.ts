import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const pendingInviteToken =
        typeof user?.user_metadata?.pending_invite_token === "string"
          ? user.user_metadata.pending_invite_token
          : null;
      const targetNext = next === "/" && pendingInviteToken
        ? `/invite/${pendingInviteToken}/accept`
        : next;
      const redirectUrl = new URL(targetNext, origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return to login page on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
