import type { ProfessionDetailApi } from "@/src/constants/types";

/**
 * Read a lane-specific profile field without leaking the default (hair-first) top-level
 * API mirror when the user is on another profession account.
 */
export function laneScopedTextField(
  detail: ProfessionDetailApi | null | undefined,
  activeLaneCode: string | null | undefined,
  laneValue: string | null | undefined,
  legacyProfileValue: string | null | undefined
): string {
  if (activeLaneCode != null || detail != null) {
    return laneValue?.trim() ?? "";
  }
  return legacyProfileValue?.trim() ?? "";
}

export function laneScopedNullableField(
  detail: ProfessionDetailApi | null | undefined,
  activeLaneCode: string | null | undefined,
  laneValue: string | null | undefined,
  legacyProfileValue: string | null | undefined
): string | null {
  if (activeLaneCode != null || detail != null) {
    const v = laneValue?.trim();
    return v ? v : null;
  }
  const legacy = legacyProfileValue?.trim();
  return legacy ? legacy : null;
}
