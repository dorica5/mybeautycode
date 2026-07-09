import { Star } from "@phosphor-icons/react/dist/ssr";

export function StarBadgeNote({ text }: { text: string }) {
  return (
    <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 rounded-full border border-foreground/20 bg-background/40 px-3 py-1.5 text-center text-sm text-foreground/80 backdrop-blur-sm md:text-base">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-white/70 text-foreground">
        <Star size={16} weight="fill" />
      </span>
      <p className="leading-snug">{text}</p>
    </div>
  );
}

