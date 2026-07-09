import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";
import { createClient } from "@supabase/supabase-js";
import {
  professionService,
  normalizeProfessionCodeInput,
} from "./professionService";
import {
  pickDefaultProfessionRow,
  resolveLaneAvatarUrl,
} from "../lib/professionBusinessHelpers";
import {
  safeBookingSiteForRead,
  sanitizeSocialMediaForStorage,
} from "../lib/safeExternalUrl";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const visitService = {
  /** Professionals only see their own visits for the client (same scope as latest). Clients see the full timeline. */
  async listClientHaircodes(
    viewerProfileId: string,
    clientUserId: string,
    professionCode?: string
  ) {
    const where: Prisma.ServiceRecordWhereInput = {
      clientUserId,
    };
    if (viewerProfileId !== clientUserId) {
      const viewerPP = await prisma.professionalProfile.findUnique({
        where: { profileId: viewerProfileId },
        select: { id: true },
      });
      if (!viewerPP) return [];
      where.professionalProfileId = viewerPP.id;
      /** Lane isolation: never return nail/brow visits when the active lane is hair (etc.). */
      const scope =
        await professionService.resolveActiveProfessionScopeForProfessionalProfile(
          viewerPP.id,
          professionCode
        );
      if (!scope) return [];
      where.professionId = scope.professionId;
    } else if (professionCode?.trim()) {
      where.professionId = await professionService.getProfessionIdByCode(
        professionCode.trim()
      );
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        professionalProfile: {
          include: {
            profile: true,
            professionalProfessions: {
              include: {
                profession: { select: { id: true, code: true, sortOrder: true } },
              },
            },
          },
        },
        media: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { mediaUrl: true, mediaType: true },
        },
      },
    });
    return records.map((r) => {
      const pp = r.professionalProfile;
      const p = pp?.profile;
      const thumb = r.media[0];
      const profRows = pp?.professionalProfessions ?? [];
      const matched = profRows.find((row) => row.professionId === r.professionId);
      const biz = matched ?? pickDefaultProfessionRow(profRows);
      const profPayload = pp
        ? {
            avatar_url: p?.avatarUrl,
            business_name: biz?.businessName ?? undefined,
            business_number: biz?.businessNumber ?? undefined,
            business_address: biz?.businessAddress ?? undefined,
            about_me: biz?.aboutMe ?? undefined,
            booking_site: safeBookingSiteForRead(biz?.bookingSite) ?? undefined,
            social_media:
              sanitizeSocialMediaForStorage(biz?.socialMedia) ?? undefined,
            salon_name:
              biz?.businessName ?? pp.displayName ?? undefined,
            salon_phone_number: biz?.businessNumber ?? undefined,
          }
        : null;
      return {
        id: r.id,
        created_at: r.createdAt?.toISOString(),
        client_id: r.clientUserId,
        professional_profile_id: r.professionalProfileId,
        hairdresser_id: pp?.profileId,
        hairdresser_name: pp?.displayName ?? (p ? profileDisplayName(p) : null),
        service_description: r.summary,
        services: (r.recordData as { services?: string })?.services ?? null,
        price:
          viewerProfileId === clientUserId
            ? null
            : r.price?.toString() ?? null,
        duration: r.durationMinutes?.toString() ?? null,
        preview_media_url: thumb?.mediaUrl ?? null,
        preview_media_type: thumb?.mediaType ?? null,
        professional_profile: profPayload,
        hairdresser_profile: profPayload,
        ...(viewerProfileId === clientUserId && {
          client_private_note:
            typeof r.clientPrivateNote === "string" && r.clientPrivateNote.trim()
              ? r.clientPrivateNote.trim()
              : null,
        }),
      };
    });
  },

  async listLatestHaircodes(
    professionalProfileIdOrProfileId: string,
    professionCode?: string | null
  ) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      professionalProfileIdOrProfileId
    );
    const scope =
      await professionService.resolveActiveProfessionScopeForProfessionalProfile(
        professionalProfileId,
        professionCode
      );
    if (!scope) return [];

    const profProfile = await prisma.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { profileId: true },
    });
    const profileId = profProfile?.profileId;
    if (!profileId) return [];

    const laneCode = scope.professionId
      ? (
          await prisma.profession.findUnique({
            where: { id: scope.professionId },
            select: { code: true },
          })
        )?.code
      : null;

    const blockedClientIds = new Set<string>();
    if (laneCode && profileId) {
      const blockers = await prisma.blockedUser.findMany({
        where: { blockedId: profileId, professionCode: laneCode },
        select: { blockerId: true },
      });
      blockers.forEach((b) => blockedClientIds.add(b.blockerId));
      const blocked = await prisma.blockedUser.findMany({
        where: { blockerId: profileId, professionCode: laneCode },
        select: { blockedId: true },
      });
      blocked.forEach((b) => blockedClientIds.add(b.blockedId));
    }

    /** Only clients with an active link (this lane) appear in latest. */
    const activeLinks = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        professionId: scope.professionId,
        status: "active",
      },
      select: { clientUserId: true },
    });
    const linkedClientIds = [
      ...new Set(activeLinks.map((l) => l.clientUserId)),
    ];
    if (linkedClientIds.length === 0) {
      return [];
    }

    const allowedClientIds = linkedClientIds.filter(
      (id) => !blockedClientIds.has(id)
    );
    if (allowedClientIds.length === 0) {
      return [];
    }

    const where: Prisma.ServiceRecordWhereInput = {
      professionalProfileId,
      professionId: scope.professionId,
      clientUserId: { in: allowedClientIds },
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    };

    const records = await prisma.serviceRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        clientUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        profession: { select: { code: true } },
      },
    });
    /** Extra filter in case of bad rows; each payload carries `profession_code` for the client. */
    const payloadLaneCode = scope.normalizedCode;
    return records
      .filter((r) => r.professionId === scope.professionId)
      .map((r) => {
        const { clientPrivateNote: _privateNoteIgnored, ...restRecord } = r;
        void _privateNoteIgnored;
        return {
          ...restRecord,
          profession_code: r.profession?.code ?? payloadLaneCode,
          client_profile: r.clientUser,
        };
      });
  },

  async getWithMedia(serviceRecordId: string) {
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: {
        profession: { select: { code: true, id: true } },
        professionalProfile: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            professionalProfessions: {
              where: { isActive: { not: false } },
              include: {
                profession: { select: { id: true, code: true, sortOrder: true } },
              },
            },
          },
        },
      },
    });
    if (!record) return null;
    const media = await prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId },
      select: { mediaUrl: true, mediaType: true, serviceRecordId: true },
    });

    const pp = record.professionalProfile;
    const p = pp?.profile;
    const profRows = pp?.professionalProfessions ?? [];
    const matched = profRows.find((row) => row.professionId === record.professionId);
    const biz = matched ?? pickDefaultProfessionRow(profRows);
    const profPayload = pp
      ? {
          avatar_url:
            resolveLaneAvatarUrl(matched?.avatarUrl, p?.avatarUrl) ?? undefined,
          business_name: biz?.businessName ?? undefined,
          business_number: biz?.businessNumber ?? undefined,
          business_address: biz?.businessAddress ?? undefined,
          about_me: biz?.aboutMe ?? undefined,
          booking_site: safeBookingSiteForRead(biz?.bookingSite) ?? undefined,
          social_media:
            sanitizeSocialMediaForStorage(biz?.socialMedia) ?? undefined,
          salon_name: biz?.businessName ?? pp.displayName ?? undefined,
          salon_phone_number: biz?.businessNumber ?? undefined,
        }
      : null;

    const hairdresserName =
      pp?.displayName ?? (p ? profileDisplayName(p) : null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { professionalProfile: _ppStrip, ...recordRest } = record;

    return {
      ...recordRest,
      media,
      hairdresser_id: pp?.profileId,
      hairdresser_name: hairdresserName,
      professional_profile: profPayload,
      hairdresser_profile: profPayload,
    };
  },

  async getMedia(serviceRecordId: string) {
    return prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId },
      select: { mediaUrl: true, mediaType: true, serviceRecordId: true },
    });
  },

  async listClientGallery(
    viewerProfileId: string,
    clientUserId: string,
    professionCode?: string
  ) {
    const where: Prisma.ServiceRecordWhereInput = {
      clientUserId,
    };
    if (viewerProfileId !== clientUserId) {
      const viewerPP = await prisma.professionalProfile.findUnique({
        where: { profileId: viewerProfileId },
        select: { id: true },
      });
      if (!viewerPP) return [];
      where.professionalProfileId = viewerPP.id;
      const scope =
        await professionService.resolveActiveProfessionScopeForProfessionalProfile(
          viewerPP.id,
          professionCode
        );
      if (!scope) return [];
      where.professionId = scope.professionId;
    } else if (professionCode?.trim()) {
      where.professionId = await professionService.getProfessionIdByCode(
        professionCode.trim()
      );
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      select: { id: true },
    });
    const ids = records.map((r) => r.id);
    if (ids.length === 0) return [];
    const media = await prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId: { in: ids } },
      select: { serviceRecordId: true, mediaUrl: true, mediaType: true },
      orderBy: { createdAt: "desc" },
    });
    return media.map((m) => ({
      haircode_id: m.serviceRecordId,
      service_record_id: m.serviceRecordId,
      media_url: m.mediaUrl,
      media_type: m.mediaType,
    }));
  },

  async create(data: {
    client_id: string;
    hairdresser_id: string;
    hairdresser_name: string;
    service_description?: string;
    services?: string;
    price?: string;
    duration?: string;
    /** Profession lane for this visit — required when multiple professions are linked. */
    profession_code?: string;
  }) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      data.hairdresser_id
    );

    const lanes = await prisma.professionalProfession.findMany({
      where: { professionalProfileId, isActive: { not: false } },
      include: { profession: { select: { code: true } } },
      orderBy: { createdAt: "asc" },
    });

    const raw =
      typeof data.profession_code === "string" && data.profession_code.trim()
        ? data.profession_code.trim()
        : "";

    let professionId: string;

    if (raw) {
      const normalized = normalizeProfessionCodeInput(raw);
      const match = lanes.find(
        (l) =>
          normalizeProfessionCodeInput(l.profession.code) === normalized
      );
      if (!match) {
        throw Object.assign(
          new Error(
            "profession_code must match one of this professional's linked profession accounts"
          ),
          { statusCode: 400 as const }
        );
      }
      professionId = match.professionId;
    } else if (lanes.length === 0) {
      /** Legacy onboarding: no `professional_professions` rows yet. */
      professionId = await professionService.getProfessionIdByCode("hair");
    } else if (lanes.length === 1) {
      professionId = lanes[0].professionId;
    } else {
      throw Object.assign(
        new Error(
          "profession_code is required when this professional has multiple profession accounts"
        ),
        { statusCode: 400 as const }
      );
    }

    const link = await prisma.clientProfessionalLink.findFirst({
      where: {
        clientUserId: data.client_id,
        professionalProfileId,
        professionId,
        status: "active",
      },
      select: { id: true },
    });

    const durationMinutes = data.duration ? parseInt(data.duration, 10) : null;
    const price = data.price ? parseFloat(data.price) : null;

    return prisma.serviceRecord.create({
      data: {
        clientUserId: data.client_id,
        professionalProfileId,
        professionId,
        clientProfessionalLinkId: link?.id,
        serviceName: data.service_description,
        summary: data.service_description,
        price: price ? Number(price) : null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        recordData: data.services ? { services: data.services } : undefined,
        createdByUserId: data.hairdresser_id,
      },
    });
  },

  async update(serviceRecordId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data.service_description != null) {
      updateData.summary = data.service_description;
      updateData.serviceName = data.service_description;
    }
    if (data.services != null) {
      updateData.recordData = { services: data.services };
    }
    if (data.price != null) updateData.price = parseFloat(String(data.price));
    if (data.duration != null) updateData.durationMinutes = parseInt(String(data.duration), 10);

    return prisma.serviceRecord.update({
      where: { id: serviceRecordId },
      data: updateData as never,
    });
  },

  /** Private note for the client on this visit only (not visible to professionals). */
  async updateClientPrivateNote(
    serviceRecordId: string,
    clientUserId: string,
    note: string
  ) {
    const trimmed = typeof note === "string" ? note.trim() : "";
    const maxChars = 1200;
    if (trimmed.length > maxChars) {
      throw Object.assign(
        new Error(`Note must be at most ${maxChars} characters`),
        { statusCode: 400 as const }
      );
    }
    return prisma.serviceRecord.update({
      where: { id: serviceRecordId, clientUserId },
      data: {
        clientPrivateNote: trimmed.length > 0 ? trimmed : null,
      },
    });
  },

  async deleteByProfessional(serviceRecordId: string, viewerProfileId: string) {
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });
    if (!record) {
      throw Object.assign(new Error("Visit not found."), { statusCode: 404 });
    }

    const viewerPP = await prisma.professionalProfile.findUnique({
      where: { profileId: viewerProfileId },
      select: { id: true },
    });

    const ownsViaProfile =
      viewerPP != null &&
      record.professionalProfileId != null &&
      record.professionalProfileId === viewerPP.id;
    const ownsViaCreator = record.createdByUserId === viewerProfileId;

    if (!ownsViaProfile && !ownsViaCreator) {
      throw Object.assign(
        new Error("You can only delete your own service records."),
        { statusCode: 403 }
      );
    }

    const createdAt = new Date(record.createdAt);
    const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      throw Object.assign(
        new Error("You can only delete service records within 7 days."),
        { statusCode: 400 }
      );
    }
    const media = await prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId },
      select: { mediaUrl: true },
    });
    if (media.length > 0) {
      await supabase.storage
        .from("haircode_images")
        .remove(media.map((m) => m.mediaUrl));
    }
    await prisma.serviceRecordMedia.deleteMany({ where: { serviceRecordId } });
    await prisma.serviceRecord.delete({ where: { id: serviceRecordId } });
    return { success: true };
  },

  async deleteByClient(serviceRecordId: string, clientUserId: string) {
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });
    if (!record || record.clientUserId !== clientUserId) {
      throw Object.assign(
        new Error("You can only delete visits on your own client account."),
        { statusCode: 403 }
      );
    }
    const media = await prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId },
      select: { mediaUrl: true },
    });
    if (media.length > 0) {
      await supabase.storage
        .from("haircode_images")
        .remove(media.map((m) => m.mediaUrl));
    }
    await prisma.serviceRecordMedia.deleteMany({ where: { serviceRecordId } });
    await prisma.serviceRecord.delete({ where: { id: serviceRecordId } });
    return { success: true };
  },

  async insertMedia(records: { haircode_id: string; media_url: string; media_type: string }[]) {
    return prisma.serviceRecordMedia.createMany({
      data: records.map((r) => ({
        serviceRecordId: r.haircode_id,
        mediaUrl: r.media_url,
        mediaType: r.media_type,
      })),
    });
  },

  async deleteMediaItems(serviceRecordId: string, mediaUrls: string[]) {
    for (const url of mediaUrls) {
      await supabase.storage.from("haircode_images").remove([url]);
    }
    for (const url of mediaUrls) {
      await prisma.serviceRecordMedia.deleteMany({
        where: { serviceRecordId, mediaUrl: url },
      });
    }
  },

  async deleteAllMedia(serviceRecordId: string) {
    await prisma.serviceRecordMedia.deleteMany({ where: { serviceRecordId } });
  },
};
