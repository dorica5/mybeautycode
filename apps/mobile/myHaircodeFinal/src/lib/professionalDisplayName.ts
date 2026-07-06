import type { Profile, ProfessionDetailApi } from "@/src/constants/types";
import { coerceProfessionCode } from "@/src/constants/professionCodes";

/** Split a full display string into first token + remainder (legacy full_name style). */
export function splitPersonName(full: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = full?.trim() ?? "";
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

export function combinePersonName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").trim();
}

type NameProfile = Pick<
  Profile,
  | "pro_first_name"
  | "pro_last_name"
  | "display_name"
  | "full_name"
  | "first_name"
  | "last_name"
  | "professions_detail"
>;

function professionDetailForCode(
  profile: NameProfile | null | undefined,
  professionCode?: string | null
): ProfessionDetailApi | null {
  const code = coerceProfessionCode(professionCode ?? undefined);
  if (!code || !profile?.professions_detail?.length) return null;
  return (
    profile.professions_detail.find(
      (row) => coerceProfessionCode(row.profession_code) === code
    ) ?? null
  );
}

/** Pro-facing full name for one lane (or legacy flat profile fields). */
export function resolveProfessionalFullName(
  profile: NameProfile | null | undefined,
  professionCode?: string | null
): string | null {
  if (!profile) return null;

  const lane = professionDetailForCode(profile, professionCode);
  if (lane) {
    const fromLaneParts = combinePersonName(
      lane.pro_first_name ?? "",
      lane.pro_last_name ?? ""
    );
    if (fromLaneParts) return fromLaneParts;
    const laneDisplay = lane.display_name?.trim();
    if (laneDisplay) return laneDisplay;
  }

  const fromParts = combinePersonName(
    profile.pro_first_name ?? "",
    profile.pro_last_name ?? ""
  );
  if (fromParts) return fromParts;
  const legacy = profile.display_name?.trim();
  if (legacy) return legacy;
  const client =
    profile.full_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return client || null;
}

export function resolveProfessionalNameParts(
  profile: NameProfile | null | undefined,
  professionCode?: string | null
): { firstName: string; lastName: string } {
  if (!profile) return { firstName: "", lastName: "" };

  const lane = professionDetailForCode(profile, professionCode);
  if (lane) {
    const first = lane.pro_first_name?.trim() ?? "";
    const last = lane.pro_last_name?.trim() ?? "";
    if (first || last) return { firstName: first, lastName: last };
    if (lane.display_name?.trim()) {
      return splitPersonName(lane.display_name);
    }
  }

  const first = profile.pro_first_name?.trim() ?? "";
  const last = profile.pro_last_name?.trim() ?? "";
  if (first || last) return { firstName: first, lastName: last };
  return splitPersonName(resolveProfessionalFullName(profile));
}
