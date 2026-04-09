import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/src/constants/types";
import {
  PROFESSION_HEADLINE_ROLE,
  pickActiveProfessionCode,
} from "@/src/constants/professionCodes";

/** Én bruker kan ha flere «overflater» (pro / klient); samme innlogging. */
export type LinkedAccountEntry = {
  id: string;
  meta: {
    roleLabel: string;
    name: string;
    detail: string;
    userType?: "HAIRDRESSER" | "CLIENT";
  };
};

/** Linked profession codes from API (`profession_codes`) or legacy camelCase. */
function professionCodesList(profile: Profile): string[] {
  const raw =
    profile.profession_codes ??
    (profile as { professionCodes?: string[] | null }).professionCodes ??
    [];
  return Array.isArray(raw) ? raw : [];
}

/**
 * Label for the professional surface on switch-account (and similar).
 * Pass `lastVisitedProfessionCode` from {@link getLastProfessionCode} when available
 * so multi-profession users see the role for their active tab.
 */
export function roleLabelForProfile(
  profile: Profile,
  lastVisitedProfessionCode?: string | null
): string {
  if (profile.user_type === "CLIENT") return "Client";
  const code = pickActiveProfessionCode(
    professionCodesList(profile),
    lastVisitedProfessionCode ?? undefined
  );
  if (code) return PROFESSION_HEADLINE_ROLE[code];
  return "Professional";
}

export function profileUserType(profile: Profile): "HAIRDRESSER" | "CLIENT" {
  return profile.user_type === "HAIRDRESSER" ? "HAIRDRESSER" : "CLIENT";
}

export function entryUserType(entry: LinkedAccountEntry): "HAIRDRESSER" | "CLIENT" {
  const ut = entry.meta.userType;
  if (ut === "HAIRDRESSER" || ut === "CLIENT") return ut;
  return entry.meta.roleLabel === "Client" ? "CLIENT" : "HAIRDRESSER";
}

/** Én rad for kun-klient; to rader (pro + klient) for frisør. */
export function expandAccountRows(entry: LinkedAccountEntry): Array<{
  entry: LinkedAccountEntry;
  surface: "professional" | "client";
}> {
  if (entryUserType(entry) === "HAIRDRESSER") {
    return [
      { entry, surface: "professional" },
      { entry, surface: "client" },
    ];
  }
  return [{ entry, surface: "client" }];
}

/** Salon only (no country) — switch account row: role, name, then salon. */
export function buildDetailLine(profile: Profile): string {
  const salon = profile.salon_name?.trim();
  return salon ?? "";
}

function displayName(profile: Profile): string {
  const full = profile.full_name?.trim();
  if (full) return full;
  const joined = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (joined) return joined;
  return profile.email?.trim() || "Account";
}

export function linkedAccountEntryFromSession(
  session: Session | null,
  profile: Profile | null
): LinkedAccountEntry | null {
  if (!session?.user?.id || !profile?.id) return null;
  return {
    id: session.user.id,
    meta: {
      roleLabel: roleLabelForProfile(profile),
      name: displayName(profile),
      detail: buildDetailLine(profile),
      userType: profileUserType(profile),
    },
  };
}
