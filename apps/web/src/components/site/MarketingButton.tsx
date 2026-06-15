import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

/** Tise-style CTAs — flat pill, no offset shadow or thick borders. */
export function MarketingButton({
  href,
  children,
  variant = "primary",
  className = "",
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-foreground text-primary-white hover:opacity-90"
      : "text-foreground underline-offset-4 hover:underline";

  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
