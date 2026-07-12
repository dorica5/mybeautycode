export type PasswordResetTokens = {
  access_token: string;
  refresh_token: string;
};

/** True in Metro dev or when explicitly enabled on preview/internal builds. */
export function isPasswordResetDevToolsEnabled(): boolean {
  return (
    __DEV__ || process.env.EXPO_PUBLIC_DEV_PASSWORD_RESET === "true"
  );
}

/**
 * Extracts Supabase recovery tokens from a reset email link.
 * Supports hash fragments (#access_token=…) and query strings.
 */
export function parsePasswordResetTokensFromUrl(
  rawUrl: string
): PasswordResetTokens | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const normalized = trimmed.includes("://")
      ? trimmed
      : `https://placeholder.local/${trimmed.replace(/^\//, "")}`;
    const url = new URL(normalized);
    const params = new URLSearchParams(url.search);

    if (url.hash.startsWith("#")) {
      const hashParams = new URLSearchParams(url.hash.slice(1));
      hashParams.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }

    const access_token = params.get("access_token")?.trim();
    const refresh_token = params.get("refresh_token")?.trim();
    if (!access_token || !refresh_token) return null;

    return { access_token, refresh_token };
  } catch {
    const hashMatch = trimmed.match(/[#&?]access_token=([^&]+)/);
    const refreshMatch = trimmed.match(/[#&?]refresh_token=([^&]+)/);
    if (!hashMatch?.[1] || !refreshMatch?.[1]) return null;

    return {
      access_token: decodeURIComponent(hashMatch[1]),
      refresh_token: decodeURIComponent(refreshMatch[1]),
    };
  }
}
