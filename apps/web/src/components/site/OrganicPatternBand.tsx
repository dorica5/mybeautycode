type Props = {
  className?: string;
  variant?: "hero" | "accent";
};

const SVG_ASPECT = 226 / 390;

const VARIANTS = {
  hero: {
    tile: "min(94vw, 26rem)",
    stretchY: 1.3,
  },
  accent: {
    tile: "min(90vw, 22rem)",
    stretchY: 1.22,
  },
} as const;

export function OrganicPatternBand({
  className = "",
  variant = "hero",
}: Props) {
  const { tile, stretchY } = VARIANTS[variant];

  return (
    <div
      aria-hidden
      className={`w-full overflow-hidden bg-background ${className}`}
      style={{
        height: `calc(${tile} * ${SVG_ASPECT} * ${stretchY})`,
        backgroundImage: "url(/images/organic-pattern.svg)",
        backgroundRepeat: "repeat-x",
        backgroundSize: `${tile} 100%`,
        backgroundPosition: "center top",
      }}
    />
  );
}
