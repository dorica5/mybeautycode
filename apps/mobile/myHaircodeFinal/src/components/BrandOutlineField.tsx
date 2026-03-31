import {
  PrimaryOutlineTextField,
  type PrimaryOutlineTextFieldProps,
} from "@/src/components/PrimaryOutlineTextField";
import React from "react";

/**
 * Setup-style labeled input: **`primaryWhite`** fill, **1 px `primaryBlack`** border (pill or area).
 * No placeholder — labels carry the meaning. Use **`BrandCountryDropdown`** when a placeholder is needed.
 */
export type BrandOutlineFieldProps = Omit<
  PrimaryOutlineTextFieldProps,
  "placeholder"
>;

export function BrandOutlineField({
  ...props
}: BrandOutlineFieldProps) {
  return (
    <PrimaryOutlineTextField
      {...props}
      placeholder={undefined}
    />
  );
}
