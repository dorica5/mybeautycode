/**
 * When true, professional onboarding saves directly and skips the paywall (dev / QA only).
 * Set `EXPO_PUBLIC_BYPASS_PRO_PAYWALL=true` in `.env` and restart Expo with a clean cache if needed.
 */
export const BYPASS_PRO_PAYWALL_FOR_DEV =
  process.env.EXPO_PUBLIC_BYPASS_PRO_PAYWALL === "1" ||
  process.env.EXPO_PUBLIC_BYPASS_PRO_PAYWALL === "true";
