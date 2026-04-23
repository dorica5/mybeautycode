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
    professionCode?: string | null
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

    return rows.map((r) => ({
      id: r.id,
      google_place_id: r.googlePlaceId,
      name: r.name,
      formatted_address: r.formattedAddress,
      latitude: r.latitude,
      longitude: r.longitude,
      professional_count: r._count.professionalProfessions,
    }));
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
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true },
    });
    if (!salon) {
      throw Object.assign(new Error("Salon not found."), { statusCode: 404 });
    }

    const professionId =
      professionCode && professionCode.trim()
        ? await professionService.getProfessionIdByCode(professionCode.trim())
        : undefined;

    const rows = await prisma.professionalProfession.findMany({
      where: {
        salonId,
        ...(professionId ? { professionId } : {}),
        OR: [{ isActive: true }, { isActive: null }],
      },
      select: {
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
      },
    });

    // Hide the viewer from their own salon listing, and de-dupe when the same
    // pro has multiple (e.g. hair + nails) professions at the place.
    const byProId = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (r.professionalProfile.profile.id === viewerProfileId) continue;
      const existing = byProId.get(r.professionalProfile.id);
      if (!existing) byProId.set(r.professionalProfile.id, r);
    }
    const filtered = Array.from(byProId.values());
    if (filtered.length === 0) return [];

    const proProfileIds = filtered.map((r) => r.professionalProfile.id);

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

    return filtered.map((r) => {
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
