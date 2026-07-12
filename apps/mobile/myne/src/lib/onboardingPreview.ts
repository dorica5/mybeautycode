/**
 * Dev-only helper. Does NOT auto-open onboarding (that broke QR testers on the same Metro).
 * Use a manual entry point (e.g. long-press on Splash) when this flag is true.
 */
export function isOnboardingPreviewEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_PREVIEW_ONBOARDING === "true";
}
