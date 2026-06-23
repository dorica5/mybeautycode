"use client";

import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { useSiteLanguage } from "@/providers/LanguageProvider";

export function SiteFooter() {
  const { t } = useSiteLanguage();

  return (
    <footer className="px-6 py-8 text-center text-sm text-foreground/65 md:px-10">
      <nav
        aria-label="Footer"
        className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium"
      >
        <Link href="/privacy" className="hover:opacity-70">
          {t.footer.privacyPolicy}
        </Link>
        <Link href="/contact" className="hover:opacity-70">
          {t.footer.contactUs}
        </Link>
      </nav>
      <p>
        © {new Date().getFullYear()} {BRAND_NAME}
      </p>
    </footer>
  );
}
