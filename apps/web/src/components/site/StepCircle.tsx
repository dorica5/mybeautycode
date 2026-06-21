import {
  StepIllustration,
  type StepIllustrationId,
} from "@/components/site/StepIllustration";

type Props = {
  step: string;
  label: string;
  illustration: StepIllustrationId;
};

export function StepCircle({ step, label, illustration }: Props) {
  return (
    <li className="flex flex-col items-center text-center">
      <div
        className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-full bg-primary-white sm:max-w-[220px] md:max-w-[240px]"
        aria-hidden
      >
        <StepIllustration id={illustration} />
      </div>
      <p className="font-display mt-5 max-w-[200px] text-sm leading-snug sm:max-w-[220px] md:max-w-[240px] md:text-base">
        <span className="font-normal">{step}: </span>
        {label}
      </p>
    </li>
  );
}
