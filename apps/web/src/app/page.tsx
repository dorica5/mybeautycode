import Image from "next/image";
import Link from "next/link";
import { SectionBand } from "@/components/site/SectionBand";
import { SectionShell } from "@/components/site/SectionShell";
import { StepCircle } from "@/components/site/StepCircle";
import type { StepIllustrationId } from "@/components/site/StepIllustration";
import { BRAND_NAME } from "@/lib/brand";

const CLIENT_STEPS: {
  step: string;
  label: string;
  illustration: StepIllustrationId;
}[] = [
  { step: "1", label: "Download the app", illustration: "download" },
  {
    step: "2",
    label: "Search for beauty professionals",
    illustration: "search-map",
  },
  {
    step: "3",
    label: "Share access to your journal",
    illustration: "share-journal",
  },
];

const PRO_STEPS: {
  step: string;
  label: string;
  illustration: StepIllustrationId;
}[] = [
  {
    step: "4",
    label: "Create a professional account",
    illustration: "pro-account",
  },
  { step: "5", label: "Get discovered", illustration: "discovered" },
  {
    step: "6",
    label: "See all client history",
    illustration: "client-history",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="shrink-0 hover:opacity-85 transition-opacity"
            aria-label={`${BRAND_NAME} home`}
          >
            <Image
              src="/images/myne-logo.svg"
              alt={BRAND_NAME}
              width={92}
              height={117}
              className="h-11 w-auto"
              priority
            />
          </Link>
          <nav className="order-3 flex w-full flex-wrap justify-center gap-6 text-[15px] font-medium md:order-none md:w-auto md:gap-8">
            <a href="#how-it-works" className="hover:opacity-70">
              How it works
            </a>
            <a href="#for-professionals" className="hover:opacity-70">
              For professionals
            </a>
            <a href="#about-us" className="hover:opacity-70">
              About us
            </a>
          </nav>
          <Link
            href="#payment"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-primary-white transition hover:opacity-90"
          >
            Download app
          </Link>
        </div>
      </header>

      <SectionShell tone="primary">
        <div className="min-h-[min(28vh,220px)]" aria-hidden />
      </SectionShell>

      <main>
        <SectionBand id="how-it-works" tone="secondary" title="How it works">
          <ul className="mx-auto grid max-w-4xl gap-14 sm:grid-cols-3 sm:gap-8">
            {CLIENT_STEPS.map((item) => (
              <StepCircle
                key={item.step}
                step={item.step}
                label={item.label}
                illustration={item.illustration}
              />
            ))}
          </ul>
        </SectionBand>

        <SectionBand
          id="for-professionals"
          tone="primary"
          title="For professionals"
        >
          <ul className="mx-auto grid max-w-4xl gap-14 sm:grid-cols-3 sm:gap-8">
            {PRO_STEPS.map((item) => (
              <StepCircle
                key={item.step}
                step={item.step}
                label={item.label}
                illustration={item.illustration}
              />
            ))}
          </ul>
        </SectionBand>

        <SectionBand id="about-us" tone="secondary" title="About us">
          <p className="mx-auto max-w-xl text-center text-base leading-relaxed text-foreground/85 md:text-lg">
            {BRAND_NAME} er bygget for individuelle fagfolk og deres kunder i
            Norge — ikke store kjeder. Din journal og historikk følger deg.
          </p>
        </SectionBand>

        <SectionBand id="payment" tone="secondary" title="Payment">
          <p className="mx-auto max-w-lg text-center text-base text-foreground/70 md:text-lg">
            Simple plans for professionals. Always free for clients. Details
            coming soon.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-white/80 px-6 py-3 text-sm font-medium">
              App Store (snart)
            </span>
            <span className="rounded-full bg-white/80 px-6 py-3 text-sm font-medium">
              Google Play (snart)
            </span>
          </div>
        </SectionBand>
      </main>

      <SectionShell tone="primary">
        <footer className="px-6 py-8 text-center text-sm text-foreground/65 md:px-10">
          <p>
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </footer>
      </SectionShell>
    </div>
  );
}
