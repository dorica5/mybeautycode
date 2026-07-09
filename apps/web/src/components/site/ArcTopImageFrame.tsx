import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/** Krusedull-inspired organic blob frame — aspect matches reference mask (477×416). */
export const arcTopImageFrameClassName =
  "relative aspect-[477/416] w-[320px] shrink-0 overflow-hidden sm:w-[360px] md:w-[480px] lg:w-[520px]";

export const compactArcTopImageFrameClassName =
  "relative aspect-[477/416] w-[160px] shrink-0 overflow-hidden sm:w-[180px] md:w-[200px] lg:w-[220px]";

const krusedullClipStyle: CSSProperties = {
  clipPath: "url(#krusedull-image-frame)",
};

type ArcTopImageFrameProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  size?: "hero" | "compact";
};

export function ArcTopImageFrame({
  children,
  className,
  size = "hero",
  style,
  ...rest
}: ArcTopImageFrameProps) {
  const baseClassName =
    size === "compact" ? compactArcTopImageFrameClassName : arcTopImageFrameClassName;

  return (
    <div
      className={className ? `${baseClassName} ${className}` : baseClassName}
      style={{ ...krusedullClipStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
