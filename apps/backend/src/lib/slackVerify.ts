import crypto from "crypto";

/** Verify Slack request signature (Events API / interactivity). */
export function verifySlackRequestSignature(
  signingSecret: string,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
  rawBody: string
): boolean {
  if (!signatureHeader?.startsWith("v0=") || !timestampHeader?.trim()) {
    return false;
  }

  const ts = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(ts)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > 60 * 5) return false;

  const base = `v0:${timestampHeader}:${rawBody}`;
  const digest = crypto
    .createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex");
  const expected = `v0=${digest}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false;
  }
}
