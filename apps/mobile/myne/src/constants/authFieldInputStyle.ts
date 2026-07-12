import type { TextStyle } from "react-native";
import { responsiveFontSize, responsivePadding } from "@/src/utils/responsive";

/** Single-line pills (auth, profile, setup) — slight extra bottom room for vertical balance. */
export const authFieldInputStyle: TextStyle = {
  paddingTop: responsivePadding(14),
  paddingBottom: responsivePadding(16),
  lineHeight: responsiveFontSize(22),
};
