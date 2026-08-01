import { supabase } from "./supabase";

/** Expired or revoked refresh token — safe to clear local session and send user to sign-in. */
export function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string"
      ? (error as { message: string }).message
      : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("invalid refresh token") ||
    lower.includes("refresh token not found") ||
    lower.includes("refresh_token_not_found")
  );
}

let purgingStaleSession = false;

/** Drop broken local auth without calling Supabase revoke (refresh token already invalid). */
export async function purgeStaleAuthSession(): Promise<void> {
  if (purgingStaleSession) return;
  purgingStaleSession = true;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* non-blocking */
  } finally {
    purgingStaleSession = false;
  }
}
