"use client";

import {
  SITE_LANGUAGES,
  type SiteLanguageCode,
} from "@/lib/languages";
import { useSiteLanguage } from "@/providers/LanguageProvider";
import { Globe } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

export function SiteLanguageDropdown({ className }: { className?: string }) {
  const { language, setLanguage, t } = useSiteLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectLanguage = (code: SiteLanguageCode) => {
    setLanguage(code);
    setOpen(false);
  };

  const currentLabel =
    SITE_LANGUAGES.find((item) => item.code === language)?.label ?? "English";

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.language.current(currentLabel)}
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-70"
      >
        <Globe size={22} weight="light" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t.language.select}
          className="absolute right-0 top-full z-30 mt-2 min-w-40 overflow-hidden rounded-xl border border-foreground/10 bg-primary-white py-1 shadow-lg"
        >
          {SITE_LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={language === item.code}
              onClick={() => selectLanguage(item.code)}
              className={`flex w-full items-center px-4 py-2.5 text-left text-[15px] transition-colors hover:bg-foreground/5 ${
                language === item.code ? "font-semibold" : "font-medium"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
