import React from "react";
import Svg, { Defs, G, Path, Rect, ClipPath } from "react-native-svg";
import type { IconProps } from "phosphor-react-native";

const SW = 1.5;

/** Head + shoulders (first / last name rows). */
export function ProfileMenuNameIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.50195 7.5C6.50195 8.95869 7.08142 10.3576 8.11286 11.3891C9.14431 12.4205 10.5433 13 12.002 13C13.4606 13 14.8596 12.4205 15.891 11.3891C16.9225 10.3576 17.502 8.95869 17.502 7.5C17.502 6.04131 16.9225 4.64236 15.891 3.61091C14.8596 2.57947 13.4606 2 12.002 2C10.5433 2 9.14431 2.57947 8.11286 3.61091C7.08142 4.64236 6.50195 6.04131 6.50195 7.5Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 22C3 19.6131 3.94821 17.3239 5.63604 15.636C7.32387 13.9483 9.61305 13 12 13C14.3869 13 16.6761 13.9483 18.364 15.636C20.0517 17.3239 21 19.6131 21 22"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Handset (phone number row). */
export function ProfileMenuPhoneIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.4701 20.4375L14.4801 20.4445C15.3441 20.9947 16.37 21.2336 17.3882 21.1218C18.4065 21.01 19.356 20.5541 20.0801 19.8295L20.7101 19.2005C20.8495 19.0612 20.9601 18.8958 21.0355 18.7138C21.1109 18.5317 21.1498 18.3366 21.1498 18.1395C21.1498 17.9425 21.1109 17.7473 21.0355 17.5653C20.9601 17.3832 20.8495 17.2178 20.7101 17.0785L18.0561 14.4275C17.7748 14.1463 17.3933 13.9884 16.9956 13.9884C16.5979 13.9884 16.2164 14.1463 15.9351 14.4275C15.7958 14.5669 15.6304 14.6775 15.4483 14.7529C15.2663 14.8284 15.0712 14.8672 14.8741 14.8672C14.677 14.8672 14.4819 14.8284 14.2999 14.7529C14.1178 14.6775 13.9524 14.5669 13.8131 14.4275L9.57114 10.1845C9.28993 9.90316 9.13196 9.52176 9.13196 9.12396C9.13196 8.72626 9.28993 8.34476 9.57114 8.06346C9.71053 7.92416 9.82111 7.7588 9.89655 7.57674C9.97199 7.39469 10.0108 7.19956 10.0108 7.0025C10.0108 6.80543 9.97199 6.6103 9.89655 6.42825C9.82111 6.2462 9.71053 6.0808 9.57114 5.9415L6.91914 3.2905C6.63785 3.00929 6.25639 2.85132 5.85864 2.85132C5.46089 2.85132 5.07943 3.00929 4.79814 3.2905L4.16814 3.9195C3.44373 4.64368 2.98806 5.59333 2.87642 6.61153C2.76478 7.62973 3.00386 8.65556 3.55414 9.51946L3.56014 9.52946C6.46632 13.8293 10.1698 17.5321 14.4701 20.4375Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Pen / edit (about me row). */
export function ProfileMenuAboutIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  const clipId = "profileMenuClipAbout";
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id={clipId}>
          <Rect width={24} height={24} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d="M22.19 1.81002C21.8494 1.47086 21.4451 1.20254 21.0002 1.02057C20.5553 0.838601 20.0788 0.746585 19.5982 0.749839C19.1176 0.753094 18.6424 0.851554 18.2 1.03953C17.7577 1.22751 17.3569 1.50128 17.021 1.84502L2.521 16.345L0.75 23.25L7.655 21.479L22.155 6.97902C22.4987 6.64309 22.7725 6.24237 22.9605 5.80001C23.1485 5.35766 23.2469 4.88245 23.2502 4.40182C23.2534 3.92119 23.1614 3.44469 22.9795 2.99983C22.7975 2.55497 22.5292 2.15058 22.19 1.81002Z"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M16.6055 2.26001L21.7395 7.39401"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M14.5117 4.354L19.6457 9.488"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M2.52148 16.345L7.66048 21.474"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

/** Rounded square frame + user (profile picture row). */
export function ProfileMenuPictureIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Rect
        x={0.75}
        y={0.75}
        width={22.5}
        height={22.5}
        rx={3.25}
        stroke={color}
        strokeWidth={SW}
      />
      <Path
        d="M6.81641 9.59461C6.81641 10.9677 7.36188 12.2845 8.3328 13.2555C9.30374 14.2264 10.6206 14.7719 11.9937 14.7719C13.3668 14.7719 14.6837 14.2264 15.6546 13.2555C16.6256 12.2845 17.171 10.9677 17.171 9.59461C17.171 8.2215 16.6256 6.90463 15.6546 5.93369C14.6837 4.96277 13.3668 4.4173 11.9937 4.4173C10.6206 4.4173 9.30374 4.96277 8.3328 5.93369C7.36188 6.90463 6.81641 8.2215 6.81641 9.59461Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.52539 23.244C3.52539 20.9971 4.41797 18.8422 6.00678 17.2534C7.59558 15.6647 9.75046 14.772 11.9974 14.772C14.2443 14.772 16.3992 15.6647 17.988 17.2534C19.5767 18.8422 20.4693 20.9971 20.4693 23.244"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Sort / list-with-arrow (manage professionals). */
export function ProfileMenuManageProfessionalsIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.36523 23.025V0.974976"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.95508 18.615L6.36508 23.025L10.7751 18.615"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.2852 5.87695H20.5752"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Path
        d="M10.2852 1.95691H22.0452"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Path
        d="M10.2852 9.79688H18.1252"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Path
        d="M10.2852 13.7169H16.1652"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Lock body + keyhole (change password). */
export function ProfileMenuChangePasswordIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.75 15C3.75 17.188 4.61919 19.2865 6.16637 20.8336C7.71354 22.3808 9.81196 23.25 12 23.25C14.188 23.25 16.2865 22.3808 17.8336 20.8336C19.3808 19.2865 20.25 17.188 20.25 15C20.25 12.812 19.3808 10.7135 17.8336 9.16637C16.2865 7.61919 14.188 6.75 12 6.75C9.81196 6.75 7.71354 7.61919 6.16637 9.16637C4.61919 10.7135 3.75 12.812 3.75 15Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.75 15C9.75 15.5967 9.98705 16.169 10.409 16.591C10.831 17.0129 11.4033 17.25 12 17.25C12.5967 17.25 13.169 17.0129 13.591 16.591C14.0129 16.169 14.25 15.5967 14.25 15C14.25 14.4033 14.0129 13.831 13.591 13.409C13.169 12.9871 12.5967 12.75 12 12.75C11.4033 12.75 10.831 12.9871 10.409 13.409C9.98705 13.831 9.75 14.4033 9.75 15Z"
        stroke={color}
        strokeWidth={SW}
      />
      <Path
        d="M6.75 8.635V6C6.75 4.60761 7.30312 3.27226 8.28769 2.28769C9.27226 1.30312 10.6076 0.75 12 0.75C13.3924 0.75 14.7277 1.30312 15.7123 2.28769C16.6969 3.27226 17.25 4.60761 17.25 6V8.635"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Minus in circle (delete account). */
export function ProfileMenuDeleteAccountIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  const clipId = "profileMenuClipDelete";
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id={clipId}>
          <Rect width={24} height={24} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d="M7.5 12H16.5"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M0.75 12C0.75 14.9837 1.93526 17.8452 4.04505 19.955C6.15483 22.0647 9.01631 23.25 12 23.25C14.9837 23.25 17.8452 22.0647 19.955 19.955C22.0647 17.8452 23.25 14.9837 23.25 12C23.25 9.01631 22.0647 6.15483 19.955 4.04505C17.8452 1.93526 14.9837 0.75 12 0.75C9.01631 0.75 6.15483 1.93526 4.04505 4.04505C1.93526 6.15483 0.75 9.01631 0.75 12Z"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

const ML10 = 10;

/** Document / terms (rounded page + lines). */
export function ProfileMenuTermsIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.5494 20.0385C20.5494 20.9154 19.9647 21.5 19.0878 21.5H4.91076C4.03384 21.5 3.44922 20.9154 3.44922 20.0385V3.96154C3.44922 3.08462 4.03384 2.5 4.91076 2.5H19.0878C19.9647 2.5 20.5494 3.08462 20.5494 3.96154V20.0385Z"
        stroke={color}
        strokeWidth={SW}
        strokeMiterlimit={ML10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.68555 7.32318H11.4856"
        stroke={color}
        strokeWidth={SW}
        strokeMiterlimit={ML10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.68555 11.7078H16.4547"
        stroke={color}
        strokeWidth={SW}
        strokeMiterlimit={ML10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.68555 16.0924H16.4547"
        stroke={color}
        strokeWidth={SW}
        strokeMiterlimit={ML10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Chat bubble with typing dots. */
export function ProfileMenuFeedbackIcon({
  size = 24,
  color = "#212427",
}: IconProps) {
  const dim = typeof size === "number" ? size : 24;
  const clipId = "profileMenuClipFeedback";
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id={clipId}>
          <Rect width={24} height={24} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d="M21.75 18.75H11.25L5.25 23.25V18.75H2.25C1.85218 18.75 1.47064 18.592 1.18934 18.3107C0.908035 18.0294 0.75 17.6478 0.75 17.25V2.25C0.75 1.85218 0.908035 1.47064 1.18934 1.18934C1.47064 0.908035 1.85218 0.75 2.25 0.75H21.75C22.1478 0.75 22.5294 0.908035 22.8107 1.18934C23.092 1.47064 23.25 1.85218 23.25 2.25V17.25C23.25 17.6478 23.092 18.0294 22.8107 18.3107C22.5294 18.592 22.1478 18.75 21.75 18.75Z"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 10.125C11.7929 10.125 11.625 9.95711 11.625 9.75C11.625 9.54289 11.7929 9.375 12 9.375"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M12 10.125C12.2071 10.125 12.375 9.95711 12.375 9.75C12.375 9.54289 12.2071 9.375 12 9.375"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M7.5 10.125C7.29289 10.125 7.125 9.95711 7.125 9.75C7.125 9.54289 7.29289 9.375 7.5 9.375"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M7.5 10.125C7.70711 10.125 7.875 9.95711 7.875 9.75C7.875 9.54289 7.70711 9.375 7.5 9.375"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M16.5 10.125C16.2929 10.125 16.125 9.95711 16.125 9.75C16.125 9.54289 16.2929 9.375 16.5 9.375"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M16.5 10.125C16.7071 10.125 16.875 9.95711 16.875 9.75C16.875 9.54289 16.7071 9.375 16.5 9.375"
          stroke={color}
          strokeWidth={SW}
        />
      </G>
    </Svg>
  );
}
