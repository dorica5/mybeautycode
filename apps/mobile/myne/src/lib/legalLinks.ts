const DEFAULT_SITE_ORIGIN = "https://myne.no";

function siteOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return fromEnv || DEFAULT_SITE_ORIGIN;
}

export function termsOfServiceUrl(): string {
  const override = process.env.EXPO_PUBLIC_TERMS_URL?.trim();
  if (override) return override;
  return `${siteOrigin()}/terms`;
}

export function privacyPolicyUrl(): string {
  const override = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim();
  if (override) return override;
  return `${siteOrigin()}/privacy`;
}
