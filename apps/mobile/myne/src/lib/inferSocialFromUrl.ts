/**
 * Heuristic social platform + list label from a user-entered URL (for Get discovered UI).
 */

export type SocialKind =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "pinterest"
  | "snapchat"
  | "threads"
  | "other";

export type InferredSocial = {
  kind: SocialKind;
  /** Short label shown in the row (e.g. “Instagram”). */
  label: string;
};

function normalizeUrlInput(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) return new URL(t);
    return new URL(`https://${t}`);
  } catch {
    return null;
  }
}

export function inferSocialFromUrl(raw: string): InferredSocial {
  const url = normalizeUrlInput(raw);
  if (!url) {
    return { kind: "other", label: "Link" };
  }
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host.includes("instagram.com")) {
    return { kind: "instagram", label: "Instagram" };
  }
  if (host.includes("tiktok.com")) {
    return { kind: "tiktok", label: "TikTok" };
  }
  if (
    host.includes("facebook.com") ||
    host === "fb.com" ||
    host.includes("fb.me")
  ) {
    return { kind: "facebook", label: "Facebook" };
  }
  if (
    host.includes("youtube.com") ||
    host.includes("youtu.be")
  ) {
    return { kind: "youtube", label: "YouTube" };
  }
  if (host.includes("linkedin.com")) {
    return { kind: "linkedin", label: "LinkedIn" };
  }
  if (
    host.includes("twitter.com") ||
    host.includes("x.com")
  ) {
    return { kind: "x", label: "X" };
  }
  if (host.includes("pinterest.com") || host.includes("pin.it")) {
    return { kind: "pinterest", label: "Pinterest" };
  }
  if (host.includes("snapchat.com")) {
    return { kind: "snapchat", label: "Snapchat" };
  }
  if (host.includes("threads.net")) {
    return { kind: "threads", label: "Threads" };
  }

  const first = host.split(".")[0] ?? "link";
  const pretty =
    first.length > 0
      ? first.charAt(0).toUpperCase() + first.slice(1)
      : "Website";
  return { kind: "other", label: pretty };
}
