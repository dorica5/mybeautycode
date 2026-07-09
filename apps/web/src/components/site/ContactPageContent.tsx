"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionShell } from "@/components/site/SectionShell";
import { useSiteLanguage } from "@/providers/LanguageProvider";

const CONTACT_EMAIL = "hello@myne.no";

export function ContactPageContent() {
  const { t } = useSiteLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SectionShell tone="primary" className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16 text-foreground md:px-10 md:py-20">
          <Link href="/" className="text-sm font-medium hover:opacity-70">
            ← {t.footer.backHome}
          </Link>
          <h1 className="font-display mt-8 text-3xl md:text-4xl">
            {t.footer.contactUs}
          </h1>
          <p className="mt-8 text-base leading-relaxed text-foreground/85 md:text-lg">
            {t.footer.contactBody}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-6 inline-block font-medium hover:opacity-70"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </SectionShell>
      <SectionShell tone="primary">
        <SiteFooter />
      </SectionShell>
    </div>
  );
}
