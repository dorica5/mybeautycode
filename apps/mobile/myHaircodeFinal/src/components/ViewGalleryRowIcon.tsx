import React, { useId } from "react";
import Svg, { Defs, G, Path, Rect, ClipPath } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

const SW = 1.5;

/** Gallery / stacked frames — “View gallery” row on professional client hub. */
export function ViewGalleryRowIcon({ size = 24, color = "#212427" }: Props) {
  const dim = size;
  const clipId = useId().replace(/:/g, "");
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id={clipId}>
          <Rect width={24} height={24} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d="M18.75 5.25V4.272C18.7515 4.00791 18.7009 3.74612 18.6012 3.50158C18.5014 3.25704 18.3545 3.03454 18.1688 2.84678C17.9831 2.65902 17.7622 2.50968 17.5188 2.40728C17.2753 2.30488 17.0141 2.25144 16.75 2.25H2.75003C2.48594 2.25144 2.22472 2.30488 1.98129 2.40728C1.73785 2.50968 1.51697 2.65902 1.33125 2.84678C1.14553 3.03454 0.998617 3.25704 0.898891 3.50158C0.799165 3.74612 0.748582 4.00791 0.75003 4.272V13.728C0.748582 13.9921 0.799165 14.2539 0.898891 14.4984C0.998617 14.743 1.14553 14.9655 1.33125 15.1532C1.51697 15.341 1.73785 15.4903 1.98129 15.5927C2.22472 15.6951 2.48594 15.7486 2.75003 15.75"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M11.3398 21.7499L15.7788 15.4429C15.9092 15.2566 16.0803 15.1025 16.2791 14.9921C16.4778 14.8816 16.6991 14.8178 16.9262 14.8055C17.1532 14.7932 17.3801 14.8326 17.5896 14.9209C17.7992 15.0091 17.986 15.1439 18.1358 15.3149L23.0738 20.9579"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M10.875 13.5C10.6679 13.5 10.5 13.3321 10.5 13.125C10.5 12.9179 10.6679 12.75 10.875 12.75"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M10.875 13.5C11.0821 13.5 11.25 13.3321 11.25 13.125C11.25 12.9179 11.0821 12.75 10.875 12.75"
          stroke={color}
          strokeWidth={SW}
        />
        <Path
          d="M22.25 8.25H7C6.44772 8.25 6 8.69772 6 9.25V20.75C6 21.3023 6.44772 21.75 7 21.75H22.25C22.8023 21.75 23.25 21.3023 23.25 20.75V9.25C23.25 8.69772 22.8023 8.25 22.25 8.25Z"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
