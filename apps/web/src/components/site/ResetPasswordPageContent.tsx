"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionShell } from "@/components/site/SectionShell";
import {
  buildPasswordResetDeepLink,
  isMobilePhoneUserAgent,
  parsePasswordResetTokensFromUrl,
} from "@/lib/passwordResetTokens";
import { useSiteLanguage } from "@/providers/LanguageProvider";

type ViewState = "loading" | "desktop" | "opening" | "mobile-fallback" | "invalid";

export function ResetPasswordPageContent() {
  const { t } = useSiteLanguage();
  const [view, setView] = useState<ViewState>("loading");
  const [copied, setCopied] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  const copy = t.resetPassword;

  useEffect(() => {
    const href = window.location.href;
    setResetUrl(href);

    const tokens = parsePasswordResetTokensFromUrl(href);
    if (!tokens) {
      setView("invalid");
      return;
    }

    const mobile = isMobilePhoneUserAgent(navigator.userAgent);
    if (!mobile) {
      setView("desktop");
      return;
    }

    setView("opening");
    window.location.href = buildPasswordResetDeepLink(tokens);

    const fallbackTimer = window.setTimeout(() => {
      setView("mobile-fallback");
    }, 2500);

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  const openInApp = useCallback(() => {
    const tokens = parsePasswordResetTokensFromUrl(resetUrl);
    if (!tokens) return;
    window.location.href = buildPasswordResetDeepLink(tokens);
  }, [resetUrl]);

  const copyLink = useCallback(async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked on some browsers.
    }
  }, [resetUrl]);

  let title = copy.pageTitle;
  let body = "";
  let primaryAction: ReactNode = null;

  if (view === "desktop") {
    title = copy.desktopTitle;
    body = copy.desktopBody;
    primaryAction = (
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-primary-white transition hover:opacity-90"
      >
        {copied ? copy.linkCopied : copy.copyLink}
      </button>
    );
  } else if (view === "opening") {
    title = copy.openingApp;
    body = copy.openingAppBody;
  } else if (view === "mobile-fallback") {
    title = copy.openInAppTitle;
    body = copy.openInAppBody;
    primaryAction = (
      <button
        type="button"
        onClick={openInApp}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-primary-white transition hover:opacity-90"
      >
        {copy.openInApp}
      </button>
    );
  } else if (view === "invalid") {
    title = copy.invalidLinkTitle;
    body = copy.invalidLinkBody;
    primaryAction = (
      <Link
        href="/"
        className="inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-primary-white transition hover:opacity-90"
      >
        {t.footer.backHome}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SectionShell tone="primary" className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-lg px-6 py-16 md:px-10">
          <div className="rounded-[20px] border border-foreground/12 bg-primary-white shadow-sm">
            <div className="rounded-t-[20px] bg-secondary-green px-7 py-8 text-center">
              <Image
                src="/icons/icon-192.png"
                alt="myne"
                width={72}
                height={72}
                className="mx-auto mb-4 rounded-2xl"
                priority
              />
              <h1 className="font-display text-2xl text-foreground md:text-3xl">
                {title}
              </h1>
            </div>

            <div className="px-7 py-8 text-center">
              {body ? (
                <p className="text-base leading-relaxed text-foreground/85 md:text-lg">
                  {body}
                </p>
              ) : null}

              {view === "desktop" ? (
                <>
                  <p className="mt-5 rounded-xl border border-foreground/15 bg-secondary-green/60 px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
                    {copy.desktopWarning}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-foreground/85 md:text-lg">
                    {copy.desktopSteps}
                  </p>
                </>
              ) : null}

              {primaryAction ? (
                <div className="mt-8 flex justify-center">{primaryAction}</div>
              ) : null}

              {view === "desktop" ? (
                <p className="mt-6 text-sm leading-relaxed text-foreground/70">
                  {copy.desktopHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </SectionShell>
      <SectionShell tone="primary">
        <SiteFooter />
      </SectionShell>
    </div>
  );
}
