import Image from "next/image";

export type StepIllustrationId =
  | "download"
  | "search-map"
  | "share-journal"
  | "pro-account"
  | "discovered"
  | "client-history";

const iconClass = "text-foreground";

/** Simple in-circle art — swap map phone for a real screenshot when you have one. */
export function StepIllustration({ id }: { id: StepIllustrationId }) {
  switch (id) {
    case "download":
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6">
          <div className="flex size-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-background md:size-[6rem]">
            <Image
              src="/images/myne-logo.svg"
              alt=""
              width={92}
              height={117}
              className="h-[2.75rem] w-auto scale-110"
            />
          </div>
          <svg
            viewBox="0 0 24 24"
            className={`h-12 w-12 shrink-0 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 3v10" strokeLinecap="round" />
            <path d="M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 19h14" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "search-map":
      return (
        <div className="flex h-full w-full items-center justify-center p-5">
          <div className="relative w-[58%] max-w-[120px] rounded-[1.1rem] border-2 border-foreground bg-background p-1 shadow-[3px_3px_0_0_#212427]">
            <div className="overflow-hidden rounded-[0.85rem] bg-secondary">
              <div className="relative aspect-[3/4] w-full">
                <div className="absolute inset-0 bg-[linear-gradient(160deg,#d8ede2_0%,#b2dcc5_55%,#d8ede2_100%)]" />
                <svg
                  viewBox="0 0 100 120"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden
                >
                  <path
                    d="M22 38c8-6 18-6 26 0s18 6 26 0"
                    stroke="#212427"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.2"
                  />
                  <circle cx="35" cy="52" r="5" fill="#212427" />
                  <circle cx="58" cy="44" r="4" fill="#212427" />
                  <circle cx="68" cy="62" r="4.5" fill="#212427" />
                  <circle cx="42" cy="72" r="3.5" fill="#212427" opacity="0.7" />
                </svg>
                <div className="absolute bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-foreground/25" />
              </div>
            </div>
          </div>
        </div>
      );

    case "share-journal":
      return (
        <div className="flex items-center justify-center gap-3 p-6">
          <svg
            viewBox="0 0 48 56"
            className={`h-14 w-12 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <rect x="4" y="6" width="32" height="44" rx="4" />
            <path d="M12 18h20M12 26h16M12 34h12" strokeLinecap="round" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className={`h-8 w-8 shrink-0 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M7 12h10" strokeLinecap="round" />
            <path d="M13 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );

    case "pro-account":
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-6">
          <svg
            viewBox="0 0 64 64"
            className={`h-16 w-16 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="32" cy="22" r="10" />
            <path d="M14 52c4-10 12-14 18-14s14 4 18 14" strokeLinecap="round" />
          </svg>
          <span className="rounded-full border-2 border-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Pro
          </span>
        </div>
      );

    case "discovered":
      return (
        <div className="relative flex h-full w-full items-center justify-center p-6">
          <svg
            viewBox="0 0 80 80"
            className={`h-20 w-20 ${iconClass}`}
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <circle cx="40" cy="40" r="26" strokeWidth="1.5" opacity="0.25" />
            <circle cx="40" cy="40" r="18" strokeWidth="1.5" opacity="0.4" />
            <circle cx="40" cy="40" r="10" strokeWidth="1.5" opacity="0.55" />
            <path
              d="M40 18c-8 0-14 6.5-14 14.5 0 10.5 14 27.5 14 27.5s14-17 14-27.5C54 24.5 48 18 40 18z"
              strokeWidth="2"
              fill="currentColor"
              fillOpacity="0.12"
            />
            <circle cx="40" cy="32" r="4" fill="currentColor" />
          </svg>
        </div>
      );

    case "client-history":
      return (
        <div className="flex flex-col items-center justify-center gap-1.5 p-7">
          {[0.85, 1, 0.7].map((scale, i) => (
            <div
              key={i}
              className="w-full max-w-[100px] rounded-lg border-2 border-foreground bg-primary-white px-2 py-1.5"
              style={{ transform: `scale(${scale})`, opacity: 1 - i * 0.12 }}
            >
              <div className="mb-1 h-1.5 w-8 rounded-full bg-foreground/30" />
              <div className="h-1 w-full rounded-full bg-foreground/15" />
              <div className="mt-0.5 h-1 w-3/4 rounded-full bg-foreground/10" />
            </div>
          ))}
        </div>
      );
  }
}
