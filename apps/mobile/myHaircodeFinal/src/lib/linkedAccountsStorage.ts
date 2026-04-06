import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/src/constants/types";

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

export function roleLabelForProfile(profile: Profile): string {
  if (profile.user_type === "CLIENT") return "Client";
  return "Hairdresser";
}

export function profileUserType(profile: Profile): "HAIRDRESSER" | "CLIENT" {
  return profile.user_type === "HAIRDRESSER" ? "HAIRDRESSER" : "CLIENT";
}

export function entryUserType(entry: LinkedAccountEntry): "HAIRDRESSER" | "CLIENT" {
  const ut = entry.meta.userType;
  if (ut === "HAIRDRESSER" || ut === "CLIENT") return ut;
  return entry.meta.roleLabel === "Hairdresser" ? "HAIRDRESSER" : "CLIENT";
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

export function buildDetailLine(profile: Profile): string {
  const parts = [profile.salon_name, profile.country].filter(
    (p): p is string => Boolean(p && String(p).trim())
  );
  return parts.join(", ");
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
