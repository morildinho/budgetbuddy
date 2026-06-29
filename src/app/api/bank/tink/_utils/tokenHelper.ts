import { createClient } from "@/lib/supabase/server";
import { issueFreshUserToken } from "./tink";

export async function ensureFreshToken(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  connection: {
    id: string;
    tink_user_id?: string | null;
    access_token: string | null;
    token_expires_at: string | null;
  }
): Promise<string> {
  const now = new Date();
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null;

  if (
    connection.access_token &&
    expiresAt &&
    expiresAt > new Date(now.getTime() + 60_000)
  ) {
    return connection.access_token;
  }

  return issueFreshUserToken(await supabase, {
    id: connection.id,
    tink_user_id: connection.tink_user_id || null,
  });
}
