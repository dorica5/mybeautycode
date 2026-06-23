import type { ReactNode } from "react";
import { SectionShell } from "@/components/site/SectionShell";

type Tone = "primary" | "secondary";

export function SectionBand({
  id,
  tone,
  title,
  children,
  className = "",
}: {
  id?: string;
  tone: Tone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SectionShell id={id} tone={tone} className={`scroll-mt-20 ${className}`}>
      <section className="px-6 py-16 text-foreground md:px-10 md:py-20">
        <h2 className="font-display text-center text-3xl md:text-4xl lg:text-[2.75rem]">
          {title}
        </h2>
        {children ? <div className="mt-14 md:mt-16">{children}</div> : null}
      </section>
    </SectionShell>
  );
}
