import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/src/constants/types";
import {
  PROFESSION_HEADLINE_ROLE,
  pickActiveProfessionCode,
  coerceProfessionCode,
  type ProfessionChoiceCode,
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

/** One row in My accounts (may be one per profession + client). */
export type AccountSurfaceRow = {
  entry: LinkedAccountEntry;
  surface: "professional" | "client";
  /** Which professional role this row is; null for the client row. */
  professionCode: ProfessionChoiceCode | null;
  roleLabel: string;
  detailLine: string;
  rowKey: string;
};

/** Linked profession codes from API (`profession_codes`) or legacy camelCase. */
export function professionCodesList(profile: Profile): string[] {
  const raw =
    profile.profession_codes ??
    (profile as { professionCodes?: string[] | null }).professionCodes ??
    [];
  return Array.isArray(raw) ? raw : [];
}

function normalizedProfessionCodes(profile: Profile): ProfessionChoiceCode[] {
  const out: ProfessionChoiceCode[] = [];
  for (const c of professionCodesList(profile)) {
    const n = coerceProfessionCode(c);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Salon name for a specific profession row (from `professions_detail` or legacy single-prof). */
function detailLineForProfession(
  profile: Profile,
  code: ProfessionChoiceCode | null
): string {
  if (code == null) return "";
  const details = profile.professions_detail;
  if (details?.length) {
    const row = details.find(
      (d) => coerceProfessionCode(d.profession_code) === code
    );
    const name = row?.business_name?.trim();
    if (name) return name;
  }
  const codes = normalizedProfessionCodes(profile);
  if (codes.length === 1 && codes[0] === code) {
    return profile.salon_name?.trim() ?? "";
  }
  return "";
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

/**
 * Rows for My accounts: one card per linked profession (e.g. Hairdresser + Brow stylist),
 * plus the Client card when the user has a professional profile.
 */
export function expandAccountRows(
  entry: LinkedAccountEntry,
  profile: Profile
): AccountSurfaceRow[] {
  if (entryUserType(entry) !== "HAIRDRESSER") {
    return [
      {
        entry,
        surface: "client",
        professionCode: null,
        roleLabel: "Client",
        detailLine: "",
        rowKey: `${entry.id}-client`,
      },
    ];
  }

  const codes = normalizedProfessionCodes(profile);
  const proRows: AccountSurfaceRow[] = [];

  if (codes.length === 0) {
    proRows.push({
      entry,
      surface: "professional",
      professionCode: null,
      roleLabel: "Professional",
      detailLine: "",
      rowKey: `${entry.id}-pro`,
    });
  } else if (codes.length === 1) {
    const only = codes[0];
    proRows.push({
      entry,
      surface: "professional",
      professionCode: only,
      roleLabel: PROFESSION_HEADLINE_ROLE[only],
      detailLine: detailLineForProfession(profile, only),
      rowKey: `${entry.id}-pro-${only}`,
    });
  } else {
    for (const code of codes) {
      proRows.push({
        entry,
        surface: "professional",
        professionCode: code,
        roleLabel: PROFESSION_HEADLINE_ROLE[code],
        detailLine: detailLineForProfession(profile, code),
        rowKey: `${entry.id}-pro-${code}`,
      });
    }
  }

  return [
    ...proRows,
    {
      entry,
      surface: "client",
      professionCode: null,
      roleLabel: "Client",
      detailLine: "",
      rowKey: `${entry.id}-client`,
    },
  ];
}

/** Salon only (no country) — legacy single detail on linked entry meta. */
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
