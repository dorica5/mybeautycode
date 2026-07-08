import type { HTMLAttributes, ReactNode } from "react";

/** Shared arc-top frame used by the hero carousel and about-us photo. */
export const arcTopImageFrameClassName =
  "relative aspect-[4/5] w-[320px] shrink-0 overflow-hidden rounded-t-[10rem] sm:w-[360px] sm:rounded-t-[11.25rem] md:w-[480px] md:rounded-t-[15rem] lg:w-[520px] lg:rounded-t-[16.25rem]";

export const compactArcTopImageFrameClassName =
  "relative aspect-[4/5] w-[160px] shrink-0 overflow-hidden rounded-t-[5rem] sm:w-[180px] sm:rounded-t-[5.625rem] md:w-[200px] md:rounded-t-[6.25rem] lg:w-[220px] lg:rounded-t-[6.875rem]";

type ArcTopImageFrameProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  size?: "hero" | "compact";
};

export function ArcTopImageFrame({
  children,
  className,
  size = "hero",
  ...rest
}: ArcTopImageFrameProps) {
  const baseClassName =
    size === "compact" ? compactArcTopImageFrameClassName : arcTopImageFrameClassName;

  return (
    <div
      className={className ? `${baseClassName} ${className}` : baseClassName}
      {...rest}
    >
      {children}
    </div>
  );
}
