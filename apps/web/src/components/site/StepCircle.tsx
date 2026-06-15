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
        className="relative flex aspect-square w-full max-w-[200px] items-center justify-center overflow-hidden rounded-full bg-primary-white md:max-w-[220px]"
        aria-hidden
      >
        <StepIllustration id={illustration} />
      </div>
      <p className="font-display mt-8 max-w-[220px] text-lg leading-snug lowercase md:text-xl">
        <span className="font-normal">{step}: </span>
        {label}
      </p>
    </li>
  );
}
