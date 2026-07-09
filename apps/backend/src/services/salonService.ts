import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { professionService } from "./professionService";
import { profileDisplayName } from "../lib/profileDisplay";
import { resolveLaneAvatarUrl } from "../lib/professionBusinessHelpers";
import {
  storedCategoriesIncludeAllCodes,
  storedCategoriesIncludeAnyCode,
  storedDiscoveryCategoriesNonEmpty,
} from "../lib/profDiscoveryCategories";
import { professionalProfileIdsHiddenFromViewer } from "../lib/blockDiscoveryHelpers";
import { billingService } from "./billingService";

export type DiscoveryMatchMode = "any" | "all";

export type BoundsInput = {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
};

/** Cap on viewport span to avoid accidental whole-country scans on very zoomed-out maps. */
const MAX_VIEWPORT_DEGREES = 5; // ~550km at the equator; plenty for city-level browsing.
/** Hard upper bound on salons per response. */
const MAX_RESULTS = 200;

/** Discovery JSON must be a non-empty array of tags (anything else excludes the row when filtering). */
function discoveryJsonIsNonEmptyArray(): Prisma.Sql {
  return Prisma.sql`jsonb_typeof(pp.discovery_categories::jsonb) = 'array'
    AND jsonb_array_length(pp.discovery_categories::jsonb) > 0`;
}

/**
 * Predicate: trimmed lower-case discovery tag equals `needle` (already lower-case).
 * Avoids brittle `Prisma.raw` `@>` composition across Prisma/driver versions.
 */
function sqlLaneHasDiscoveryTag(normalizedDiscoveryCode: string): Prisma.Sql {
  const needle = normalizedDiscoveryCode;
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(pp.discovery_categories::jsonb) dc(tag_txt)
    WHERE lower(trim(tag_txt)) = ${needle}
  )`;
}

/** Compound lash tags in DB can match granular filters. */
function sqlLaneDiscoveryNeedle(normalizedDiscoveryCode: string): Prisma.Sql {
  const needle = normalizedDiscoveryCode;
  if (needle === "lash_tinting" || needle === "lash_lift") {
    return Prisma.sql`(${sqlLaneHasDiscoveryTag(needle)} OR ${sqlLaneHasDiscoveryTag("lash_lift_tint")})`;
  }
  return sqlLaneHasDiscoveryTag(needle);
}

/** Map pins only include pros who opted in via Get discovered (non-empty tag list). */
function discoveryOptInSqlFragment(): Prisma.Sql {
  return Prisma.sql`AND ${discoveryJsonIsNonEmptyArray()}`;
}

/** Include lane if discovery JSON lists every tag in `normalizedCodes` (AND). */
function discoveryCategoriesAllSqlFragment(
  normalizedCodes: string[] | undefined
): Prisma.Sql {
  if (!normalizedCodes?.length) return discoveryOptInSqlFragment();
  const usable = discoveryJsonIsNonEmptyArray();

  let combined = sqlLaneDiscoveryNeedle(normalizedCodes[0]);
  for (let i = 1; i < normalizedCodes.length; i++) {
    combined = Prisma.sql`(${combined} AND ${sqlLaneDiscoveryNeedle(normalizedCodes[i])})`;
  }
  return Prisma.sql`AND ${usable}
    AND (${combined})`;
}

/** Include lane if discovery JSON lists at least one tag in `normalizedCodes` (OR). */
function discoveryCategoriesAnySqlFragment(
  normalizedCodes: string[] | undefined
): Prisma.Sql {
  if (!normalizedCodes?.length) return discoveryOptInSqlFragment();
  const usable = discoveryJsonIsNonEmptyArray();

  let combined = sqlLaneDiscoveryNeedle(normalizedCodes[0]);
  for (let i = 1; i < normalizedCodes.length; i++) {
    combined = Prisma.sql`(${combined} OR ${sqlLaneDiscoveryNeedle(normalizedCodes[i])})`;
  }
  return Prisma.sql`AND ${usable}
    AND (${combined})`;
}

function discoveryCategoriesSqlFragment(
  normalizedCodes: string[] | undefined,
  matchMode: DiscoveryMatchMode = "any"
): Prisma.Sql {
  if (matchMode === "all") {
    return discoveryCategoriesAllSqlFragment(normalizedCodes);
  }
  return discoveryCategoriesAnySqlFragment(normalizedCodes);
}

function laneMatchesDiscoveryFilter(
  discoveryCategories: unknown,
  normalizedCodes: string[] | undefined,
  matchMode: DiscoveryMatchMode
): boolean {
  if (!normalizedCodes?.length) {
    return storedDiscoveryCategoriesNonEmpty(discoveryCategories);
  }
  if (matchMode === "all") {
    return storedCategoriesIncludeAllCodes(
      discoveryCategories,
      normalizedCodes
    );
  }
  return storedCategoriesIncludeAnyCode(
    discoveryCategories,
    normalizedCodes
  );
}

async function countActiveProsAtSalonForLane(
  salonId: string,
  professionId: string,
  discoveryNormalizedCodes: string[] | undefined,
  matchMode: DiscoveryMatchMode = "any",
  hiddenProfessionalProfileIds?: Set<string>
): Promise<number> {
  const rows = await prisma.professionalProfession.findMany({
    where: {
      salonId,
      professionId,
      OR: [{ isActive: true }, { isActive: null }],
      ...(hiddenProfessionalProfileIds && hiddenProfessionalProfileIds.size > 0
        ? {
            professionalProfileId: {
              notIn: [...hiddenProfessionalProfileIds],
            },
          }
        : {}),
    },
    select: { discoveryCategories: true },
  });
  return rows.filter((r) =>
    laneMatchesDiscoveryFilter(
      r.discoveryCategories,
      discoveryNormalizedCodes,
      matchMode
    )
  ).length;
}

export const salonService = {
  /**
   * Salons inside the given map bounds that have at least one active professional
   * matching `professionCode` (if provided). Grouping by Google place_id means
   * all pros sharing the same business address appear as one pin.
   */
  async findInBounds(
    bounds: BoundsInput,
    professionCode?: string | null,
    /** Logged-in client: ensures salons for pros they’re linked with still appear (e.g. lane inactive, edge cases). */
    viewerProfileId?: string | null,
    /** When non-empty: lane row must match selected get-discovered tags (`any` = OR, `all` = AND). */
    discoveryCategories?: string[] | null,
    discoveryMatch: DiscoveryMatchMode = "any"
  ): Promise<
    Array<{
      id: string;
      google_place_id: string;
      name: string | null;
      formatted_address: string;
      latitude: number;
      longitude: number;
      professional_count: number;
    }>
  > {
    const { neLat, neLng, swLat, swLng } = bounds;

    if (
      !Number.isFinite(neLat) ||
      !Number.isFinite(neLng) ||
      !Number.isFinite(swLat) ||
      !Number.isFinite(swLng) ||
      neLat < swLat ||
      neLng < swLng
    ) {
      throw Object.assign(new Error("Invalid map bounds."), { statusCode: 400 });
    }
    if (
      neLat - swLat > MAX_VIEWPORT_DEGREES ||
      neLng - swLng > MAX_VIEWPORT_DEGREES
    ) {
      throw Object.assign(
        new Error("Zoom in further to search this area."),
        { statusCode: 400 }
      );
    }

    const professionId =
      professionCode && professionCode.trim()
        ? await professionService.getProfessionIdByCode(professionCode.trim())
        : undefined;

    const discoveryCodes =
      Array.isArray(discoveryCategories) && discoveryCategories.length > 0
        ? [...discoveryCategories].sort()
        : undefined;

    const professionSql = professionId
      ? Prisma.sql`AND pp.profession_id = ${professionId}::uuid`
      : Prisma.sql``;
    const discoverySql = discoveryCategoriesSqlFragment(
      discoveryCodes,
      discoveryMatch
    );

    const hiddenProProfileIds = viewerProfileId?.trim() && professionCode?.trim()
      ? await professionalProfileIdsHiddenFromViewer(
          viewerProfileId.trim(),
          professionCode.trim()
        )
      : new Set<string>();
    const hideProsSql =
      hiddenProProfileIds.size > 0
        ? Prisma.sql`AND pp.professional_profile_id NOT IN (${Prisma.join(
            [...hiddenProProfileIds].map((id) => Prisma.sql`${id}::uuid`)
          )})`
        : Prisma.sql``;

    const aggregated = await prisma.$queryRaw<
      Array<{
        id: string;
        google_place_id: string;
        name: string | null;
        formatted_address: string;
        latitude: number;
        longitude: number;
        professional_count: bigint;
      }>
    >(Prisma.sql`
      SELECT s.id,
             s.google_place_id AS google_place_id,
             s.name,
             s.formatted_address AS formatted_address,
             s.latitude,
             s.longitude,
             COUNT(pp.id)::bigint AS professional_count
      FROM salons s
      INNER JOIN professional_professions pp ON pp.salon_id = s.id
      WHERE s.latitude >= ${swLat} AND s.latitude <= ${neLat}
        AND s.longitude >= ${swLng} AND s.longitude <= ${neLng}
        AND pp.salon_id IS NOT NULL
        AND (pp.is_active IS NULL OR pp.is_active = true)
        ${professionSql}
        ${discoverySql}
        ${hideProsSql}
      GROUP BY s.id, s.google_place_id, s.name, s.formatted_address, s.latitude, s.longitude
      ORDER BY s.id
      LIMIT ${MAX_RESULTS}
    `);

    const base = aggregated.map((r) => ({
      id: r.id,
      google_place_id: r.google_place_id,
      name: r.name,
      formatted_address: r.formatted_address,
      latitude: r.latitude,
      longitude: r.longitude,
      professional_count: Number(r.professional_count),
    }));

    const byId = new Map(base.map((s) => [s.id, s]));

    if (viewerProfileId?.trim() && professionId) {
      const viewer = viewerProfileId.trim();
      const links = await prisma.clientProfessionalLink.findMany({
        where: {
          clientUserId: viewer,
          professionId,
          status: { in: ["active", "pending"] },
        },
        select: { professionalProfileId: true },
      });
      const profileIds = [
        ...new Set(links.map((l) => l.professionalProfileId)),
      ];
      if (profileIds.length > 0) {
        const ppWithSalon = await prisma.professionalProfession.findMany({
          where: {
            professionalProfileId: { in: profileIds },
            professionId,
            salonId: { not: null },
            OR: [{ isActive: true }, { isActive: null }],
          },
          select: { salonId: true, discoveryCategories: true },
        });
        const filteredLinks = ppWithSalon.filter((row) =>
          laneMatchesDiscoveryFilter(
            row.discoveryCategories,
            discoveryCodes,
            discoveryMatch
          )
        );
        const linkedSalonIds = [
          ...new Set(
            filteredLinks
              .map((r) => r.salonId)
              .filter((id): id is string => id != null)
          ),
        ];
        if (linkedSalonIds.length > 0) {
          const extras = await prisma.salon.findMany({
            where: {
              id: { in: linkedSalonIds },
              latitude: { gte: swLat, lte: neLat },
              longitude: { gte: swLng, lte: neLng },
            },
            select: {
              id: true,
              googlePlaceId: true,
              name: true,
              formattedAddress: true,
              latitude: true,
              longitude: true,
            },
          });
          for (const r of extras) {
            if (byId.has(r.id)) continue;
            const cnt = await countActiveProsAtSalonForLane(
              r.id,
              professionId,
              discoveryCodes,
              discoveryMatch,
              hiddenProProfileIds
            );
            if (cnt < 1) continue;
            byId.set(r.id, {
              id: r.id,
              google_place_id: r.googlePlaceId,
              name: r.name,
              formatted_address: r.formattedAddress,
              latitude: r.latitude,
              longitude: r.longitude,
              professional_count: cnt,
            });
          }
        }
      }
    }

    return Array.from(byId.values());
  },

  /**
   * Professionals at a given salon, optionally filtered to a profession lane.
   * Shape matches `searchProfessionalsWithRelationship` so the mobile pro list
   * components can render either source interchangeably.
   */
  async listProfessionals(
    salonId: string,
    viewerProfileId: string,
    professionCode?: string | null,
    discoveryCategories?: string[] | null,
    discoveryMatch: DiscoveryMatchMode = "any"
  ): Promise<
    Array<{
      professional_profile_id: string;
      profile_id: string;
      hairdresser_id: string;
      full_name: string | null;
      avatar_url: string | null;
      has_relationship: boolean;
      link_pending: boolean;
      business_name: string | null;
      has_active_subscription: boolean;
    }>
  > {
    const professionIdPromise =
      professionCode && professionCode.trim()
        ? professionService.getProfessionIdByCode(professionCode.trim())
        : Promise.resolve(undefined as string | undefined);

    const [salon, professionId] = await Promise.all([
      prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true },
      }),
      professionIdPromise,
    ]);

    if (!salon) {
      throw Object.assign(new Error("Salon not found."), { statusCode: 404 });
    }

    const discoveryCodes =
      Array.isArray(discoveryCategories) && discoveryCategories.length > 0
        ? [...discoveryCategories].sort()
        : undefined;

    const rowSelect = {
      professionId: true,
      businessName: true,
      avatarUrl: true,
      discoveryCategories: true,
      professionalProfile: {
        select: {
          id: true,
          displayName: true,
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    } as const;

    const [rows, viewerProfessionalProfile] = await Promise.all([
      prisma.professionalProfession.findMany({
        where: {
          salonId,
          ...(professionId ? { professionId } : {}),
          OR: [{ isActive: true }, { isActive: null }],
        },
        select: rowSelect,
      }),
      prisma.professionalProfile.findFirst({
        where: {
          OR: [{ profileId: viewerProfileId }, { id: viewerProfileId }],
        },
        select: { id: true },
      }),
    ]);

    // De-dupe when the same pro has multiple (e.g. hair + nails) professions at the place.
    const byProId = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const existing = byProId.get(r.professionalProfile.id);
      if (!existing) byProId.set(r.professionalProfile.id, r);
    }
    let merged = Array.from(byProId.values());

    /**
     * Map pins count everyone with an active row at this salon for the lane.
     * In rare cases the list query can omit the signed-in professional (e.g. JWT
     * `sub` vs `profiles.id` drift in older clients, or replication lag). If they
     * truly have a row here, merge them so the sheet matches the pin.
     */
    if (viewerProfessionalProfile) {
      const alreadyListed = merged.some(
        (r) => r.professionalProfile.id === viewerProfessionalProfile.id
      );
      if (!alreadyListed) {
        const viewerMembership = await prisma.professionalProfession.findFirst({
          where: {
            salonId,
            professionalProfileId: viewerProfessionalProfile.id,
            ...(professionId ? { professionId } : {}),
            OR: [{ isActive: true }, { isActive: null }],
          },
          select: rowSelect,
        });
        if (viewerMembership) {
          merged.push(viewerMembership);
        }
      }
    }

    if (discoveryCodes?.length) {
      merged = merged.filter((r) =>
        laneMatchesDiscoveryFilter(
          r.discoveryCategories,
          discoveryCodes,
          discoveryMatch
        )
      );
    } else {
      merged = merged.filter((r) =>
        storedDiscoveryCategoriesNonEmpty(r.discoveryCategories)
      );
    }

    const hiddenProIds = professionCode?.trim()
      ? await professionalProfileIdsHiddenFromViewer(
          viewerProfileId,
          professionCode.trim()
        )
      : new Set<string>();
    if (hiddenProIds.size > 0) {
      merged = merged.filter(
        (r) => !hiddenProIds.has(r.professionalProfile.id)
      );
    }

    if (merged.length === 0) return [];

    const proProfileIds = merged.map((r) => r.professionalProfile.id);

    // Link state (per lane when filtered, else any lane) so the UI can show
    // "connected" badges in the salon sheet.
    const links = await prisma.clientProfessionalLink.findMany({
      where: {
        clientUserId: viewerProfileId,
        professionalProfileId: { in: proProfileIds },
        ...(professionId ? { professionId } : {}),
      },
      select: { professionalProfileId: true, status: true },
    });
    const activeSet = new Set<string>();
    const pendingSet = new Set<string>();
    for (const l of links) {
      if (l.status === "active") activeSet.add(l.professionalProfileId);
      else if (l.status === "pending") pendingSet.add(l.professionalProfileId);
    }

    const profileIds = merged.map((r) => r.professionalProfile.profile.id);
    const subscribedProfileIds =
      await billingService.profileIdsWithActiveSubscription(profileIds);

    return merged.map((r) => {
      const pp = r.professionalProfile;
      return {
        professional_profile_id: pp.id,
        profile_id: pp.profile.id,
        hairdresser_id: pp.profile.id,
        full_name: pp.displayName ?? profileDisplayName(pp.profile),
        avatar_url: resolveLaneAvatarUrl(r.avatarUrl, pp.profile.avatarUrl),
        has_relationship: activeSet.has(pp.id),
        link_pending: pendingSet.has(pp.id),
        business_name: r.businessName,
        has_active_subscription: subscribedProfileIds.has(pp.profile.id),
      };
    });
  },
};
