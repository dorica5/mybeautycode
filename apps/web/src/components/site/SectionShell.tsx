import type { ReactNode } from "react";

type Tone = "primary" | "secondary";

const centerTone: Record<Tone, string> = {
  primary: "bg-background",
  secondary: "bg-background",
};

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
    <div id={id} className={`w-full ${centerTone[tone]} ${className}`}>
      {children}
    </div>
  );
}