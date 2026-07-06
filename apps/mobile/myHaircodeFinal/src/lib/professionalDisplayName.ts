import type { Profile } from "@/src/constants/types";

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
>;

/** Pro-facing full name: separate pro first/last, then legacy fallbacks. */
export function resolveProfessionalFullName(
  profile: NameProfile | null | undefined
): string | null {
  if (!profile) return null;
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
  profile: NameProfile | null | undefined
): { firstName: string; lastName: string } {
  if (!profile) return { firstName: "", lastName: "" };
  const first = profile.pro_first_name?.trim() ?? "";
  const last = profile.pro_last_name?.trim() ?? "";
  if (first || last) return { firstName: first, lastName: last };
  return splitPersonName(resolveProfessionalFullName(profile));
}
