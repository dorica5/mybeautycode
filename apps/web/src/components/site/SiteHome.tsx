"use client";

import Image from "next/image";
import Link from "next/link";
import { AppDownloadBadges } from "@/components/site/AppDownloadBadges";
import { HeroImageCarousel } from "@/components/site/HeroImageCarousel";
import { ArcTopImageFrame } from "@/components/site/ArcTopImageFrame";
import { KrusedullClipDefs } from "@/components/site/KrusedullClipDefs";
import { SiteLanguageDropdown } from "@/components/site/SiteLanguageDropdown";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionBand } from "@/components/site/SectionBand";
import { SectionShell } from "@/components/site/SectionShell";
import { PaymentPlans } from "@/components/site/PaymentPlans";
import { StepCircle } from "@/components/site/StepCircle";
import { StarBadgeNote } from "@/components/site/StarBadgeNote";
import type { StepIllustrationId } from "@/components/site/StepIllustration";
import { BRAND_NAME } from "@/lib/brand";
import { useSiteLanguage } from "@/providers/LanguageProvider";

const CLIENT_ILLUSTRATIONS: StepIllustrationId[] = [
  "download",
  "search-map",
  "share-journal",
];

const PRO_ILLUSTRATIONS: StepIllustrationId[] = [
  "pro-account",
  "discovered",
  "client-history",
];

export function SiteHome() {
  const { t } = useSiteLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <KrusedullClipDefs />
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <Link
            href="/"
            className="shrink-0"
            aria-label={t.nav.homeAriaLabel}
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
          <nav className="order-3 flex w-full flex-wrap justify-center gap-6 text-[15px] font-medium md:order-none md:ml-auto md:w-auto md:gap-8">
            <a href="#how-it-works" className="hover:opacity-70">
              {t.nav.howItWorks}
            </a>
            <a href="#for-professionals" className="hover:opacity-70">
              {t.nav.forProfessionals}
            </a>
            <a href="#payment" className="hover:opacity-70">
              {t.nav.payment}
            </a>
            <a href="#about-us" className="hover:opacity-70">
              {t.nav.aboutUs}
            </a>
          </nav>
          <SiteLanguageDropdown className="order-2 ml-auto shrink-0 md:order-none" />
        </div>
      </header>

      <SectionShell tone="primary">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-6 pb-14 pt-10 md:flex-row md:items-start md:gap-10 lg:gap-12 md:px-10 md:pb-16 md:pt-14">
          <div className="mt-4 flex shrink-0 flex-col items-center gap-10 self-center md:mt-6 md:max-w-[38%] md:items-start md:gap-14 md:self-start">
            <div className="flex flex-col items-center gap-4 md:items-start">
              <p className="font-display text-center text-3xl leading-tight text-foreground md:text-left md:text-4xl lg:text-[2.75rem]">
                my care, my way
              </p>
              <p className="max-w-md text-center text-base leading-relaxed text-foreground/85 md:text-left md:text-lg lg:text-xl">
                {t.heroSubtitle}
              </p>
            </div>
            <div className="flex justify-center md:justify-start">
              <AppDownloadBadges />
            </div>
          </div>
          <div className="flex w-full justify-center md:flex-1 md:self-center">
            <HeroImageCarousel />
          </div>
        </div>
      </SectionShell>

      <main>
        <SectionBand id="how-it-works" tone="secondary" title={t.sections.howItWorks}>
          <ul className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-12 md:gap-x-8">
            {t.clientSteps.map((label, index) => (
              <StepCircle
                key={index + 1}
                step={String(index + 1)}
                label={label}
                illustration={CLIENT_ILLUSTRATIONS[index]}
              />
            ))}
          </ul>
          <StarBadgeNote text={t.badgeNotes.clients} />
        </SectionBand>

        <SectionBand
          id="for-professionals"
          tone="primary"
          title={t.sections.forProfessionals}
        >
          <ul className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-12 md:gap-x-8">
            {t.proSteps.map((label, index) => (
              <StepCircle
                key={index + 4}
                step={String(index + 4)}
                label={label}
                illustration={PRO_ILLUSTRATIONS[index]}
              />
            ))}
          </ul>
          <StarBadgeNote text={t.badgeNotes.professionals} />
        </SectionBand>

        <SectionBand id="payment" tone="secondary" title={t.sections.payment}>
          <PaymentPlans />
        </SectionBand>

        <SectionBand id="about-us" tone="secondary" title={t.sections.aboutUs}>
          <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center text-base leading-relaxed text-foreground/85 md:text-lg">
            {t.aboutBody.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <p className="mt-2 font-medium">{t.aboutSignOff}</p>
            <div className="mt-2 flex justify-center">
              <ArcTopImageFrame size="compact">
                <Image
                  src="/images/about/team-dorcas-cecilie-v2.png"
                  alt={t.aboutTeamPhotoAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 180px, 220px"
                  className="object-cover object-center"
                />
              </ArcTopImageFrame>
            </div>
          </div>
        </SectionBand>
      </main>

      <SectionShell tone="primary">
        <SiteFooter />
      </SectionShell>
    </div>
  );
}
