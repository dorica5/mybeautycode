import React, { useId } from "react";
import Svg, {
  G,
  Path,
  Defs,
  ClipPath,
  Rect,
} from "react-native-svg";
import type { SocialKind } from "@/src/lib/inferSocialFromUrl";

const STROKE = "#212427";

/** Design SVG — 24×24 plus. */
export function PlusStroke24() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.9961 2.82495V21.1753"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.82422 12.2041H21.1742"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Design SVG — 16×16 info. */
export function InfoStroke16() {
  const cid = useId().replace(/:/g, "_");
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <G clipPath={`url(#${cid})`}>
        <Path
          d="M9.5 11H9C8.7348 11 8.4804 10.8947 8.29287 10.7071C8.10533 10.5196 8 10.2652 8 10V7.5C8 7.3674 7.94733 7.2402 7.85353 7.14647C7.7598 7.05267 7.6326 7 7.5 7H7"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M7.75 5C7.61193 5 7.5 4.88807 7.5 4.75C7.5 4.61193 7.61193 4.5 7.75 4.5"
          stroke={STROKE}
        />
        <Path
          d="M7.75 5C7.88807 5 8 4.88807 8 4.75C8 4.61193 7.88807 4.5 7.75 4.5"
          stroke={STROKE}
        />
        <Path
          d="M8 15.5C12.1421 15.5 15.5 12.1421 15.5 8C15.5 3.85787 12.1421 0.5 8 0.5C3.85787 0.5 0.5 3.85787 0.5 8C0.5 12.1421 3.85787 15.5 8 15.5Z"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id={cid}>
          <Rect width={16} height={16} fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

/** Design SVG — 16×16 pencil. */
export function PencilStroke16() {
  const cid = useId().replace(/:/g, "_");
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <G clipPath={`url(#${cid})`}>
        <Path
          d="M14.7933 1.2066C14.5663 0.980492 14.2967 0.801612 14.0001 0.680299C13.7035 0.558986 13.3859 0.497642 13.0655 0.499811C12.7451 0.501981 12.4283 0.567621 12.1333 0.692939C11.8385 0.818259 11.5713 1.00077 11.3473 1.22993L1.68067 10.8966L0.5 15.4999L5.10333 14.3193L14.77 4.6526C14.9991 4.42865 15.1817 4.1615 15.307 3.86659C15.4323 3.57169 15.4979 3.25489 15.5001 2.93447C15.5023 2.61405 15.4409 2.29638 15.3197 1.99981C15.1983 1.70323 15.0195 1.43364 14.7933 1.2066Z"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M11.0703 1.50659L14.493 4.92926"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9.67578 2.90259L13.0984 6.32525"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M1.67969 10.8967L5.10569 14.3161"
          stroke={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id={cid}>
          <Rect width={16} height={16} fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

/** Design SVG — 20×20 Instagram. */
export function InstagramStroke20() {
  const cid = useId().replace(/:/g, "_");
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <G clipPath={`url(#${cid})`}>
        <Path
          d="M15.3 0.625H4.7C2.44944 0.625 0.625 2.44944 0.625 4.7V15.3C0.625 17.5506 2.44944 19.375 4.7 19.375H15.3C17.5506 19.375 19.375 17.5506 19.375 15.3V4.7C19.375 2.44944 17.5506 0.625 15.3 0.625Z"
          stroke={STROKE}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9.9987 12.9166C11.6095 12.9166 12.9154 11.6108 12.9154 9.99992C12.9154 8.38909 11.6095 7.08325 9.9987 7.08325C8.38786 7.08325 7.08203 8.38909 7.08203 9.99992C7.08203 11.6108 8.38786 12.9166 9.9987 12.9166Z"
          stroke={STROKE}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M13.332 3.33325H6.66536C4.82441 3.33325 3.33203 4.82564 3.33203 6.66659V13.3333C3.33203 15.1742 4.82441 16.6666 6.66536 16.6666H13.332C15.1729 16.6666 16.6654 15.1742 16.6654 13.3333V6.66659C16.6654 4.82564 15.1729 3.33325 13.332 3.33325Z"
          stroke={STROKE}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M13.8607 6.35417C13.7456 6.35417 13.6523 6.26089 13.6523 6.14583C13.6523 6.03077 13.7456 5.9375 13.8607 5.9375"
          stroke={STROKE}
          strokeWidth={1.25}
        />
        <Path
          d="M13.8633 6.35417C13.9784 6.35417 14.0716 6.26089 14.0716 6.14583C14.0716 6.03077 13.9784 5.9375 13.8633 5.9375"
          stroke={STROKE}
          strokeWidth={1.25}
        />
      </G>
      <Defs>
        <ClipPath id={cid}>
          <Rect width={20} height={20} fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

/** Design SVG — 20×20 globe / web. */
export function GlobeStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10.0013 18.6459C11.7113 18.6459 13.3829 18.1388 14.8047 17.1888C16.2264 16.2388 17.3346 14.8885 17.989 13.3087C18.6433 11.7288 18.8146 9.99045 18.481 8.31336C18.1474 6.63623 17.324 5.0957 16.1148 3.88656C14.9056 2.67742 13.3651 1.85398 11.688 1.52038C10.0109 1.18678 8.2725 1.35799 6.69268 2.01237C5.11286 2.66676 3.76258 3.77492 2.81255 5.19671C1.86254 6.61852 1.35547 8.29003 1.35547 10.0001C1.35547 12.2932 2.26637 14.4923 3.88777 16.1136C5.50918 17.7351 7.70828 18.6459 10.0013 18.6459Z"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.78125 12.7124H17.9608"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.78125 7.2876H17.9608"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.13042 1.5564C6.57862 7.15541 6.80707 13.0985 8.78411 18.5619"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.867 1.5564C12.5449 3.99303 12.8871 6.51078 12.8842 9.03992C12.8893 12.2868 12.3256 15.5096 11.2188 18.5619"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Same stroke weight as Instagram / web — generic link. */
function LinkChainStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M8.2 11.8L6.4 13.6C5.3 14.7 3.5 14.7 2.4 13.6C1.3 12.5 1.3 10.7 2.4 9.6L4.2 7.8"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.8 8.2L13.6 6.4C14.7 5.3 16.5 5.3 17.6 6.4C18.7 7.5 18.7 9.3 17.6 10.4L15.8 12.2"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 12.5L12.5 7.5"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** TikTok note mark (filled; standard Simple Icons–style path, 24×24). */
function TikTokStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        fill={STROKE}
        d="M12.525.02c1.31-.02 2.61-.01 3.918-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 3.13-.01 6.26-.02 9.39-.08 1.55-.63 3.11-1.65 4.25-1.13 1.28-2.75 2.09-4.41 2.33-1.04.16-2.09.14-3.13-.02-1.92-.3-3.71-1.32-4.98-2.94-1.09-1.39-1.68-3.12-1.65-4.88.06-2.05 1.05-3.99 2.63-5.3 1.2-.97 2.74-1.56 4.32-1.62.93-.04 1.86.05 2.74.27v4.19c-.44-.12-.89-.21-1.35-.27-.85-.12-1.72.02-2.48.41-.76.39-1.34 1.05-1.65 1.85-.25.61-.31 1.28-.17 1.92.21.97.87 1.85 1.76 2.28 1.03.52 2.26.54 3.35.21 1.02-.31 1.9-1.02 2.43-1.95.35-.61.51-1.31.48-2.01v-14.1z"
      />
    </Svg>
  );
}

/** Facebook “f” on a circle (filled, brand-recognizable at small sizes). */
function FacebookStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        fill={STROKE}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </Svg>
  );
}

function YoutubeStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M17.5 6.4C17.3 5.6 16.7 5 15.9 4.8C14.8 4.5 10 4.5 10 4.5C10 4.5 5.2 4.5 4.1 4.8C3.3 5 2.7 5.6 2.5 6.4C2.2 7.5 2.2 10 2.2 10C2.2 10 2.2 12.5 2.5 13.6C2.7 14.4 3.3 15 4.1 15.2C5.2 15.5 10 15.5 10 15.5C10 15.5 14.8 15.5 15.9 15.2C16.7 15 17.3 14.4 17.5 13.6C17.8 12.5 17.8 10 17.8 10C17.8 10 17.8 7.5 17.5 6.4Z"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.4 12.5V7.5L12.6 10L8.4 12.5Z"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** LinkedIn “in” lockup in rounded square (filled). */
function LinkedInStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        fill={STROKE}
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </Svg>
  );
}

/** X (Twitter) 2023 wordmark shape — two angled bars (filled). */
function XStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        fill={STROKE}
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </Svg>
  );
}

function PinterestStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3.125C6.203 3.125 3.125 6.203 3.125 10C3.125 12.9 5.05 15.35 7.65 16.25L7.3 14.15C7.05 12.85 7.5 11.75 8.4 11.2C6.95 10.85 6 9.55 6 8C6 5.9 7.8 4.2 10 4.2C12.95 4.2 14.5 6.35 14.5 9C14.5 11.4 13.2 13 11.5 13C10.6 13 9.95 12.2 10.2 11.3L10.85 8.6C11.05 7.75 10.65 6.95 9.8 6.95C9 6.95 8.25 7.75 8.05 9.05C7.95 9.55 8.05 10.05 8.25 10.45C8.15 10.95 8.1 11.45 8.15 12"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SnapchatStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2.5C7.5 2.5 6.25 4 6 6.25C5.85 7.75 5.5 8.5 4.5 8.75C3.75 9 3.25 9.5 3.5 10.25C3.75 11 4.5 11.25 5.5 11.5C6 12.75 7.5 13.5 10 13.5C12.5 13.5 14 12.75 14.5 11.5C15.5 11.25 16.25 11 16.5 10.25C16.75 9.5 16.25 9 15.5 8.75C14.5 8.5 14.15 7.75 14 6.25C13.75 4 12.5 2.5 10 2.5Z"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 14.25L8.25 16.75L10 15.5L11.75 16.75L12.5 14.25"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ThreadsStroke20() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M14.5 7.5C14.5 5 12.8 3.125 10 3.125C6.9 3.125 5 5.6 5 9.5C5 13.8 7.2 16.875 10.5 16.875C13.2 16.875 15 14.8 15.5 12"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.5 3.125C10.5 6.5 12 9.25 15 10.5"
        stroke={STROKE}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SocialStrokeIcon20({ kind }: { kind: SocialKind }) {
  switch (kind) {
    case "instagram":
      return <InstagramStroke20 />;
    case "tiktok":
      return <TikTokStroke20 />;
    case "facebook":
      return <FacebookStroke20 />;
    case "youtube":
      return <YoutubeStroke20 />;
    case "linkedin":
      return <LinkedInStroke20 />;
    case "x":
      return <XStroke20 />;
    case "pinterest":
      return <PinterestStroke20 />;
    case "snapchat":
      return <SnapchatStroke20 />;
    case "threads":
      return <ThreadsStroke20 />;
    default:
      return <LinkChainStroke20 />;
  }
}
