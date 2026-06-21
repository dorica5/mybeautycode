"use client";

import { MapPin } from "@phosphor-icons/react";
import type { ReactElement, ReactNode } from "react";

export type StepIllustrationId =
  | "download"
  | "search-map"
  | "share-journal"
  | "pro-account"
  | "discovered"
  | "client-history";

const stroke = "#212427";
const green = "#D8EDE2";
const mint = "#B2DCC5";
const white = "#F1F9F4";

function Phone({
  x,
  y,
  w = 52,
  h = 96,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: ReactNode;
}) {
  const r = w >= 58 ? 11 : 10;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={r}
        fill={green}
        stroke={stroke}
        strokeWidth={2.5}
      />
      <rect x={w / 2 - 8} y={6} width={16} height={4} rx={2} fill={stroke} opacity={0.25} />
      {children}
    </g>
  );
}

function DownloadIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <circle cx={100} cy={100} r={88} fill={white} />
      <Phone x={70} y={30} w={60} h={110}>
        <circle cx={30} cy={43} r={24} fill={mint} />
        <image
          href="/images/myne-logo.svg"
          x={19}
          y={26}
          width={22}
          height={34}
          preserveAspectRatio="xMidYMid meet"
        />
      </Phone>
      <g
        transform="translate(100 162) scale(1.25) translate(-16 -16)"
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 5v11" />
        <path d="M12 13l4 4 4-4" />
        <path d="M8 20v4h16v-4" />
      </g>
    </svg>
  );
}

function SearchMapIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <circle cx={100} cy={100} r={88} fill={white} />
      <Phone x={70} y={45} w={60} h={110}>
        <g transform="scale(1.154 1.146)">
          <rect x={8} y={22} width={36} height={58} rx={4} fill={mint} opacity={0.6} />
          <path
            d="M14 52c8-10 16-6 20-2s12 8 20-2"
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            opacity={0.25}
          />
          <circle cx={18} cy={44} r={5} fill={stroke} />
          <circle cx={18} cy={44} r={2} fill={white} />
          <circle cx={34} cy={58} r={5} fill={stroke} />
          <circle cx={34} cy={58} r={2} fill={white} />
          <circle cx={24} cy={72} r={5} fill={stroke} />
          <circle cx={24} cy={72} r={2} fill={white} />
        </g>
      </Phone>
      <circle cx={128} cy={88} r={22} fill={white} stroke={stroke} strokeWidth={2.5} />
      <circle cx={128} cy={88} r={14} fill="none" stroke={stroke} strokeWidth={2} />
      <line x1={140} y1={100} x2={152} y2={112} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function ShareJournalIllustration() {
  const phoneW = 52;
  const phoneH = 98;
  const phoneGap = 4;
  const phoneY = (200 - phoneH) / 2;
  const leftPhoneX = (200 - (phoneW * 2 + phoneGap)) / 2;
  const rightPhoneX = leftPhoneX + phoneW + phoneGap;

  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <circle cx={100} cy={100} r={88} fill={white} />
      <Phone x={leftPhoneX} y={phoneY} w={phoneW} h={phoneH}>
        <g transform="scale(1.13 1.14)">
          <rect x={8} y={20} width={30} height={4} rx={2} fill={stroke} opacity={0.2} />
          <rect x={8} y={28} width={26} height={3} rx={1.5} fill={stroke} opacity={0.12} />
          <rect x={8} y={34} width={28} height={3} rx={1.5} fill={stroke} opacity={0.12} />
          <rect x={8} y={40} width={22} height={3} rx={1.5} fill={stroke} opacity={0.12} />
          <rect x={8} y={50} width={30} height={18} rx={3} fill={mint} stroke={stroke} strokeWidth={1} />
        </g>
      </Phone>
      <Phone x={rightPhoneX} y={phoneY} w={phoneW} h={phoneH}>
        <g transform="scale(1.13 1.14)">
          <circle cx={23} cy={32} r={10} fill={mint} stroke={stroke} strokeWidth={1.5} />
          <rect x={8} y={48} width={30} height={3} rx={1.5} fill={stroke} opacity={0.15} />
          <rect x={8} y={54} width={24} height={3} rx={1.5} fill={stroke} opacity={0.1} />
          <rect x={8} y={60} width={28} height={3} rx={1.5} fill={stroke} opacity={0.1} />
        </g>
      </Phone>
      <circle cx={100} cy={100} r={10} fill={stroke} />
      <path
        d="M96 100h8M100 96v8"
        stroke={white}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProAccountIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <circle cx={100} cy={100} r={88} fill={white} />
      <Phone x={70} y={45} w={60} h={110}>
        <g transform="scale(1.154 1.146)">
          <circle cx={26} cy={36} r={16} fill={mint} stroke={stroke} strokeWidth={2} />
          <circle cx={26} cy={32} r={6} fill={stroke} opacity={0.25} />
          <path
            d="M16 48c2-6 8-8 10-8s8 2 10 8"
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.25}
          />
          <rect x={10} y={58} width={32} height={3} rx={1.5} fill={stroke} opacity={0.12} />
          <rect x={10} y={64} width={28} height={3} rx={1.5} fill={stroke} opacity={0.1} />
          <rect x={10} y={72} width={32} height={14} rx={3} fill={green} stroke={stroke} strokeWidth={1} />
        </g>
      </Phone>
      <circle cx={142} cy={73} r={16} fill={stroke} />
      <path d="M136 73h12M142 67v12" stroke={white} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={136} y={98} width={36} height={24} rx={4} fill={green} stroke={stroke} strokeWidth={1.5} />
      <text x={154} y={113} textAnchor="middle" fill={stroke} fontSize={7} fontWeight={600}>
        PRO
      </text>
    </svg>
  );
}

function DiscoveredIllustration() {
  const phoneW = 60;
  const phoneH = 110;
  const phoneX = (200 - phoneW) / 2;
  const phoneY = (200 - phoneH) / 2;

  return (
    <div className="absolute inset-0" aria-hidden>
      <svg viewBox="0 0 200 200" className="size-full">
        <circle cx={100} cy={100} r={88} fill={white} />
        <circle cx={100} cy={100} r={36} fill="none" stroke={mint} strokeWidth={2} opacity={0.8} />
        <circle cx={100} cy={100} r={50} fill="none" stroke={mint} strokeWidth={1.5} opacity={0.5} />
        <circle cx={100} cy={100} r={64} fill="none" stroke={mint} strokeWidth={1} opacity={0.3} />
        <Phone x={phoneX} y={phoneY} w={phoneW} h={phoneH}>
          <g transform="scale(1.154 1.146)">
            <rect x={8} y={22} width={36} height={50} rx={4} fill={mint} opacity={0.5} />
            <circle cx={26} cy={44} r={10} fill={mint} />
            <circle cx={26} cy={41} r={4} fill={stroke} opacity={0.25} />
            <path
              d="M19 51c1.2-3 3.8-4 7-4s5.8 1 7 4"
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.25}
            />
          </g>
        </Phone>
        <circle cx={48} cy={100} r={3} fill={green} stroke={stroke} strokeWidth={1} />
        <circle cx={152} cy={100} r={2.5} fill={green} stroke={stroke} strokeWidth={1} />
      </svg>
      <MapPin
        weight="light"
        aria-hidden
        className="absolute left-1/2 h-11 w-11 -translate-x-1/2 text-foreground md:h-12 md:w-12"
        style={{ top: `${((phoneY - 26) / 200) * 100}%` }}
      />
    </div>
  );
}

function ClientHistoryIllustration() {
  const cardW = 84;
  const cardH = 52;
  const offsetX = 6;
  const offsetY = 10;
  const stackW = cardW + offsetX * 2;
  const stackH = cardH + offsetY * 2;
  const frontX = (200 - stackW) / 2 + offsetX * 2;
  const frontY = (200 - stackH) / 2;

  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <circle cx={100} cy={100} r={88} fill={white} />
      <rect
        x={frontX - offsetX * 2}
        y={frontY + offsetY * 2}
        width={cardW}
        height={cardH}
        rx={6}
        fill={green}
        stroke={stroke}
        strokeWidth={2}
        opacity={0.7}
      />
      <rect
        x={frontX - offsetX}
        y={frontY + offsetY}
        width={cardW}
        height={cardH}
        rx={6}
        fill={green}
        stroke={stroke}
        strokeWidth={2}
        opacity={0.85}
      />
      <rect
        x={frontX}
        y={frontY}
        width={cardW}
        height={cardH}
        rx={6}
        fill={green}
        stroke={stroke}
        strokeWidth={2}
      />
      <rect x={frontX + 8} y={frontY + 10} width={36} height={4} rx={2} fill={stroke} opacity={0.2} />
      <rect x={frontX + 8} y={frontY + 18} width={52} height={3} rx={1.5} fill={stroke} opacity={0.12} />
      <rect x={frontX + 8} y={frontY + 24} width={44} height={3} rx={1.5} fill={stroke} opacity={0.12} />
      <rect
        x={frontX + 8}
        y={frontY + 32}
        width={28}
        height={12}
        rx={3}
        fill={mint}
        stroke={stroke}
        strokeWidth={1}
      />
    </svg>
  );
}

const ILLUSTRATIONS: Record<StepIllustrationId, () => ReactElement> = {
  download: DownloadIllustration,
  "search-map": SearchMapIllustration,
  "share-journal": ShareJournalIllustration,
  "pro-account": ProAccountIllustration,
  discovered: DiscoveredIllustration,
  "client-history": ClientHistoryIllustration,
};

export function StepIllustration({ id }: { id: StepIllustrationId }) {
  const Illustration = ILLUSTRATIONS[id];
  return <Illustration />;
}
