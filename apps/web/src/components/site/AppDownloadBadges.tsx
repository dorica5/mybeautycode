"use client";

import { useSiteLanguage } from "@/providers/LanguageProvider";

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M16.365 12.682c-.02-2.186 1.786-3.235 1.864-3.285-1.015-1.484-2.595-1.686-3.155-1.711-1.343-.136-2.623.79-3.304.79-.681 0-1.734-.771-2.852-.751-1.467.021-2.818.852-3.57 2.165-1.522 2.642-.389 6.551 1.093 8.696.725 1.047 1.587 2.223 2.719 2.18 1.092-.043 1.502-.705 2.821-.705 1.319 0 1.689.705 2.842.683 1.174-.021 1.917-1.068 2.636-2.12.83-1.205 1.171-2.373 1.191-2.433-.026-.012-2.286-.877-2.313-3.499zM13.873 4.98c.6-.729 1.004-1.743.893-2.755-.863.035-1.905.575-2.525 1.304-.557.644-1.044 1.674-.913 2.662.966.075 1.955-.492 2.545-1.211z" />
    </svg>
  );
}

function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#EA4335" d="M3.6 1.8 13.2 12 3.6 22.2a1.2 1.2 0 0 1-.6-1V2.8a1.2 1.2 0 0 1 .6-1z" />
      <path fill="#FBBC04" d="M13.2 12 3.6 22.2 14.4 16.8z" />
      <path fill="#4285F4" d="M13.2 12 14.4 7.2 3.6 1.8z" />
      <path fill="#34A853" d="M20.4 10.8 14.4 7.2 13.2 12l1.2 4.8 6-2.4a1.2 1.2 0 0 0 0-2.4z" />
    </svg>
  );
}

function AppStoreBadge() {
  const { t } = useSiteLanguage();

  return (
    <div
      className="flex h-10 items-center gap-2 rounded-[0.45rem] bg-black px-2.5 text-white sm:h-11 sm:px-3"
      aria-hidden
    >
      <AppleLogo className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
      <div className="leading-none">
        <div className="text-[9px] tracking-tight sm:text-[10px]">
          {t.download.appStoreTop}
        </div>
        <div className="mt-0.5 text-[15px] font-semibold tracking-tight sm:text-base">
          {t.download.appStoreBottom}
        </div>
      </div>
    </div>
  );
}

function GooglePlayBadge() {
  const { t } = useSiteLanguage();

  return (
    <div
      className="flex h-10 items-center gap-2 rounded-[0.45rem] bg-black px-2.5 text-white sm:h-11 sm:px-3"
      aria-hidden
    >
      <GooglePlayLogo className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
      <div className="leading-none">
        <div className="text-[8px] font-medium uppercase tracking-wide sm:text-[9px]">
          {t.download.googlePlayTop}
        </div>
        <div className="mt-0.5 text-[15px] tracking-tight sm:text-base">
          <span className="font-normal">{t.download.googlePlayNormal}</span>
          <span className="font-semibold">{t.download.googlePlayBold}</span>
        </div>
      </div>
    </div>
  );
}

/** App Store + Google Play badges (visual only for now). */
export function AppDownloadBadges() {
  const { t } = useSiteLanguage();

  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={t.download.ariaLabel}>
      <AppStoreBadge />
      <GooglePlayBadge />
    </div>
  );
}
