/** User-facing app name (modal copy, alerts, empty states, legal intro). */
export const BRAND_DISPLAY_NAME = "myne";

/** Deep-link / OAuth redirect scheme (must match app.json `scheme`). */
export const APP_URL_SCHEME = "myne";

export const SUPPORT_EMAIL = "support@myne.no";

export function passwordResetRedirectUrl(): string {
  return `${APP_URL_SCHEME}://reset-password`;
}
