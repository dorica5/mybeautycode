import {
  PrimaryOutlineTextField,
  type PrimaryOutlineTextFieldProps,
} from "@/src/components/PrimaryOutlineTextField";
import React from "react";

/**
 * Setup-style input: **`primaryWhite`** fill, **1 px `primaryBlack`** border (pill or area).
 * Valgfri `placeholder` når label ikke er nok (f.eks. telefon med landskode).
 */
export type BrandOutlineFieldProps = PrimaryOutlineTextFieldProps;

export function BrandOutlineField(props: BrandOutlineFieldProps) {
  return <PrimaryOutlineTextField {...props} />;
}
