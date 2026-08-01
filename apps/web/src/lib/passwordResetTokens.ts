export type PasswordResetTokens = {
  access_token: string;
  refresh_token: string;
};

/** Extracts Supabase recovery tokens from a reset email link (hash or query). */
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

export function buildPasswordResetDeepLink(tokens: PasswordResetTokens): string {
  const hash = new URLSearchParams({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    type: "recovery",
  }).toString();

  return `myne://reset-password#${hash}`;
}

/** True for phones — tablets and desktops get the “use your phone” message. */
export function isMobilePhoneUserAgent(userAgent: string): boolean {
  return /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(
    userAgent
  );
}
