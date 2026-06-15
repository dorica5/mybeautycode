import type { ReactNode } from "react";
import { SectionPatternEdge } from "@/components/site/SectionPatternEdge";

type Tone = "primary" | "secondary";

const centerTone: Record<Tone, string> = {
  primary: "bg-background",
  secondary: "bg-card",
};

/** Section row: one stretched pattern tile per side, content in the middle. */
export function SectionShell({
  children,
  tone,
  id,
  className = "",
}: {
  children: ReactNode;
  tone: Tone;
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} className={`flex w-full items-stretch ${className}`}>
      <SectionPatternEdge side="left" />
      <div className={`min-w-0 flex-1 ${centerTone[tone]}`}>{children}</div>
      <SectionPatternEdge side="right" />
    </div>
  );
}
