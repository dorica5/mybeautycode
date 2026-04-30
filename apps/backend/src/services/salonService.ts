import { prisma } from "../lib/prisma";
import { professionService } from "./professionService";
import { profileDisplayName } from "../lib/profileDisplay";

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
    viewerProfileId?: string | null
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

    const rows = await prisma.salon.findMany({
      where: {
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
        professionalProfessions: professionId
          ? {
              some: {
                professionId,
                OR: [{ isActive: true }, { isActive: null }],
              },
            }
          : {
              some: {
                OR: [{ isActive: true }, { isActive: null }],
              },
            },
      },
      select: {
        id: true,
        googlePlaceId: true,
        name: true,
        formattedAddress: true,
        latitude: true,
        longitude: true,
        _count: {
          select: {
            professionalProfessions: {
              where: professionId
                ? {
                    professionId,
                    OR: [{ isActive: true }, { isActive: null }],
                  }
                : { OR: [{ isActive: true }, { isActive: null }] },
            },
          },
        },
      },
      take: MAX_RESULTS,
    });

    const base = rows.map((r) => ({
      id: r.id,
      google_place_id: r.googlePlaceId,
      name: r.name,
      formatted_address: r.formattedAddress,
      latitude: r.latitude,
      longitude: r.longitude,
      professional_count: r._count.professionalProfessions,
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
          },
          select: { salonId: true },
        });
        const linkedSalonIds = [
          ...new Set(
            ppWithSalon
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
              _count: {
                select: {
                  professionalProfessions: {
                    where: {
                      professionId,
                      OR: [{ isActive: true }, { isActive: null }],
                    },
                  },
                },
              },
            },
          });
          for (const r of extras) {
            if (byId.has(r.id)) continue;
            const cnt = r._count.professionalProfessions;
            byId.set(r.id, {
              id: r.id,
              google_place_id: r.googlePlaceId,
              name: r.name,
              formatted_address: r.formattedAddress,
              latitude: r.latitude,
              longitude: r.longitude,
              professional_count: cnt > 0 ? cnt : 1,
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
    professionCode?: string | null
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

    const rowSelect = {
      professionId: true,
      businessName: true,
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

    return merged.map((r) => {
      const pp = r.professionalProfile;
      return {
        professional_profile_id: pp.id,
        profile_id: pp.profile.id,
        hairdresser_id: pp.profile.id,
        full_name: pp.displayName ?? profileDisplayName(pp.profile),
        avatar_url: pp.profile.avatarUrl,
        has_relationship: activeSet.has(pp.id),
        link_pending: pendingSet.has(pp.id),
        business_name: r.businessName,
      };
    });
  },
};
