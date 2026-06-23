"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionShell } from "@/components/site/SectionShell";
import { getTermsAndPrivacy } from "@/lib/i18n/termsAndPrivacy";
import { useSiteLanguage } from "@/providers/LanguageProvider";
export function PrivacyPageContent() {
  const { language, t } = useSiteLanguage();
  const content = getTermsAndPrivacy(language);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SectionShell tone="primary" className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16 text-foreground md:px-10 md:py-20">
          <Link href="/" className="text-sm font-medium hover:opacity-70">
            ← {t.footer.backHome}
          </Link>

          <h1 className="font-display mt-8 text-3xl md:text-4xl">
            {content.pageTitle}
          </h1>

          <p className="mt-8 text-base leading-relaxed text-foreground/85 md:text-lg">            {content.intro}
          </p>

          <div className="mt-4 flex flex-col gap-8">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold md:text-xl">
                  {section.heading}
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/85 md:text-lg">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </SectionShell>
      <SectionShell tone="primary">
        <SiteFooter />
      </SectionShell>
    </div>
  );
}
