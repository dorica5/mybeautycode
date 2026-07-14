import type { Profile, ProfessionDetailApi } from "@/src/constants/types";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";

export function professionDetailForCode(
  profile: Pick<Profile, "professions_detail"> | null | undefined,
  code: string | null | undefined
): ProfessionDetailApi | null {
  const normalized = coerceProfessionCode(code ?? undefined);
  if (!normalized || !profile?.professions_detail?.length) return null;
  return (
    profile.professions_detail.find(
      (row) => coerceProfessionCode(row.profession_code) === normalized
    ) ?? null
  );
}

function normalizedProfessionCodes(
  profile: Pick<Profile, "profession_codes"> | null | undefined
): ProfessionChoiceCode[] {
  const out: ProfessionChoiceCode[] = [];
  for (const raw of profile?.profession_codes ?? []) {
    const code = coerceProfessionCode(raw);
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/** Safe legacy fallback when there is only one profession lane (flat `/me` mirrors that row). */
function isSingleProfessionAccount(
  profile: Pick<Profile, "profession_codes"> | null | undefined,
  activeCode: ProfessionChoiceCode | null
): boolean {
  const codes = normalizedProfessionCodes(profile);
  if (codes.length !== 1) return false;
  return activeCode == null || codes[0] === activeCode;
}

export function resolveLaneBusinessName(
  profile: Profile,
  activeCode: ProfessionChoiceCode | null
): string {
  const detail = professionDetailForCode(profile, activeCode);
  const lane = detail?.business_name?.trim();
  if (lane) return lane;
  if (detail != null) return "";
  if (isSingleProfessionAccount(profile, activeCode)) {
    return (profile.business_name ?? profile.salon_name ?? "").trim();
  }
  return "";
}

export function resolveLaneBusinessPhone(
  profile: Profile,
  activeCode: ProfessionChoiceCode | null
): string | null {
  const detail = professionDetailForCode(profile, activeCode);
  const lane = detail?.business_number?.trim();
  if (lane) return lane;
  if (detail != null) return null;
  if (isSingleProfessionAccount(profile, activeCode)) {
    const legacy = (
      profile.business_number ?? profile.salon_phone_number ?? ""
    ).trim();
    return legacy || null;
  }
  return null;
}

export function resolveLaneBusinessAddress(
  profile: Profile,
  activeCode: ProfessionChoiceCode | null
): string {
  const detail = professionDetailForCode(profile, activeCode);
  const lane = detail?.business_address?.trim();
  if (lane) return lane;
  if (detail != null) return "";
  if (isSingleProfessionAccount(profile, activeCode)) {
    return (profile.business_address ?? "").trim();
  }
  return "";
}

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
  const lane = laneValue?.trim();
  if (lane) return lane;
  if (detail != null) return "";
  if (activeLaneCode != null) {
    return legacyProfileValue?.trim() ?? "";
  }
  return legacyProfileValue?.trim() ?? "";
}

export function laneScopedNullableField(
  detail: ProfessionDetailApi | null | undefined,
  activeLaneCode: string | null | undefined,
  laneValue: string | null | undefined,
  legacyProfileValue: string | null | undefined
): string | null {
  const lane = laneValue?.trim();
  if (lane) return lane;
  if (detail != null) return null;
  const legacy = legacyProfileValue?.trim();
  return legacy ? legacy : null;
}
