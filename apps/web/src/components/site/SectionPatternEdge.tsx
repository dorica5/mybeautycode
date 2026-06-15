type Side = "left" | "right";

const PATTERN_SRC = "/images/organic-pattern-white.svg";

const railClass =
  "relative hidden shrink-0 self-stretch overflow-hidden bg-background lg:block lg:w-[72px] xl:w-[96px] 2xl:w-[120px]";

/**
 * One pattern tile per section — height matches the section, width follows aspect ratio.
 * Flipped vertically only (scaleY), cropped in the narrow rail.
 */
export function SectionPatternEdge({ side }: { side: Side }) {
  const align = side === "left" ? "ml-auto" : "mr-auto";
  const flip =
    side === "left" ? "scale-x-[-1] scale-y-[-1]" : "scale-y-[-1]";

  return (
    <div aria-hidden className={railClass}>
      {/* Decorative SVG; native img scales reliably to section height */}
      <img
        src={PATTERN_SRC}
        alt=""
        className={`block h-full w-auto max-w-none ${flip} ${align}`}
        draggable={false}
      />
    </div>
  );
}
