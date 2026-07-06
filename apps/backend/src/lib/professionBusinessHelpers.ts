/**
 * Salon / bio / social live on `professional_professions` (per profession).
 * These helpers pick a default row for legacy flat API fields and serialize detail arrays.
 */

import {
  profileDisplayName,
  professionalProfileDisplayName,
  splitDisplayName,
} from "./profileDisplay";
import { normalizeProfessionCodeInput } from "./normalizeProfessionCode";
import {
  safeBookingSiteForRead,
  sanitizeSocialMediaForStorage,
} from "./safeExternalUrl";

export type ProfessionJoinRow = {
  profession: { code: string; sortOrder: number } | null | undefined;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  businessName: string | null;
  businessNumber: string | null;
  businessAddress: string | null;
  aboutMe: string | null;
  socialMedia: string | null;
  bookingSite: string | null;
  avatarUrl?: string | null;
  /** JSON array of discovery category codes (see `profDiscoveryCategories.ts`). */
  discoveryCategories: unknown;
};

export type LaneProfessionalName = {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
};

/** Pro name for one lane: lane parts → client legal name → legacy shared pro row. */
export function resolveLaneProfessionalName(
  row: ProfessionJoinRow | null | undefined,
  clientProfile: {
    firstName?: string | null;
    lastName?: string | null;
  },
  legacyProf?: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null
): LaneProfessionalName {
  if (row) {
    const fromLaneParts = profileDisplayName({
      firstName: row.firstName,
      lastName: row.lastName,
    });
    if (fromLaneParts) {
      return {
        firstName: row.firstName?.trim() || null,
        lastName: row.lastName?.trim() || null,
        displayName: fromLaneParts,
      };
    }
    const legacyLane = row.displayName?.trim();
    if (legacyLane) {
      const split = splitDisplayName(legacyLane);
      return {
        firstName: split.firstName,
        lastName: split.lastName,
        displayName: legacyLane,
      };
    }
  }

  const clientDisplay = profileDisplayName(clientProfile);
  if (clientDisplay) {
    return {
      firstName: clientProfile.firstName?.trim() || null,
      lastName: clientProfile.lastName?.trim() || null,
      displayName: clientDisplay,
    };
  }

  const fromGlobal = professionalProfileDisplayName(legacyProf ?? null);
  if (fromGlobal) {
    return {
      firstName: legacyProf?.firstName?.trim() || null,
      lastName: legacyProf?.lastName?.trim() || null,
      displayName: fromGlobal,
    };
  }

  return { firstName: null, lastName: null, displayName: null };
}

/** Lane-specific avatar when set; otherwise the base profile photo. */
export function resolveLaneAvatarUrl(
  laneAvatarUrl: string | null | undefined,
  profileAvatarUrl: string | null | undefined
): string | null {
  const lane =
    typeof laneAvatarUrl === "string" ? laneAvatarUrl.trim() : "";
  if (lane) return lane;
  const base =
    typeof profileAvatarUrl === "string" ? profileAvatarUrl.trim() : "";
  return base || null;
}

/** Prefer explicit lane code, else `hair`, else lowest `sort_order`. */
export function pickProfessionRowForCode<T extends ProfessionJoinRow>(
  rows: T[],
  professionCode?: string | null
): T | null {
  if (!rows?.length) return null;
  const raw = professionCode?.trim();
  if (raw) {
    const normalized = normalizeProfessionCodeInput(raw);
    const match = rows.find(
      (r) =>
        normalizeProfessionCodeInput(r.profession?.code ?? "") === normalized
    );
    if (match) return match;
  }
  return pickDefaultProfessionRow(rows);
}

/** Prefer `hair`, else lowest `sort_order` (stable tie-break). */
export function pickDefaultProfessionRow<T extends ProfessionJoinRow>(
  rows: T[]
): T | null {
  if (!rows?.length) return null;
  const hair = rows.find((r) => r.profession?.code === "hair");
  if (hair) return hair;
  return [...rows].sort(
    (a, b) =>
      (a.profession?.sortOrder ?? 0) - (b.profession?.sortOrder ?? 0)
  )[0] ?? null;
}

export function professionsDetailSnakeCase(
  rows: ProfessionJoinRow[],
  clientProfile: {
    firstName?: string | null;
    lastName?: string | null;
  },
  legacyProf?: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null
) {
  return rows.map((r) => {
    const laneName = resolveLaneProfessionalName(r, clientProfile, legacyProf);
    return {
      profession_code: r.profession?.code ?? null,
      pro_first_name: laneName.firstName,
      pro_last_name: laneName.lastName,
      display_name: laneName.displayName,
      business_name: r.businessName ?? null,
      business_number: r.businessNumber ?? null,
      business_address: r.businessAddress ?? null,
      about_me: r.aboutMe ?? null,
      social_media: sanitizeSocialMediaForStorage(r.socialMedia),
      booking_site: safeBookingSiteForRead(r.bookingSite),
      avatar_url: r.avatarUrl ?? null,
      discovery_categories: Array.isArray(r.discoveryCategories)
        ? (r.discoveryCategories as string[])
        : [],
    };
  });
}
