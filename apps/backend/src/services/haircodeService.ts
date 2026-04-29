import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";
import { createClient } from "@supabase/supabase-js";
import {
  professionService,
  normalizeProfessionCodeInput,
} from "./professionService";
import { pickDefaultProfessionRow } from "../lib/professionBusinessHelpers";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const haircodeService = {
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
            booking_site: biz?.bookingSite ?? undefined,
            social_media: biz?.socialMedia ?? undefined,
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
        price: r.price?.toString() ?? null,
        duration: r.durationMinutes?.toString() ?? null,
        preview_media_url: thumb?.mediaUrl ?? null,
        preview_media_type: thumb?.mediaType ?? null,
        professional_profile: profPayload,
        hairdresser_profile: profPayload,
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

    const blocking = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: profileId }, { blockedId: profileId }],
      },
    });
    const blockedIds = new Set<string>();
    blocking.forEach((b) => {
      if (b.blockerId === profileId) blockedIds.add(b.blockedId);
      else blockedIds.add(b.blockerId);
    });

    /** Latest visits = this lane’s service records; lane is `profession_id` on the visit. Do not require a per-lane link row (legacy data may only have older links). Still exclude blocked clients. */
    const where: Prisma.ServiceRecordWhereInput = {
      professionalProfileId,
      professionId: scope.professionId,
    };
    if (blockedIds.size > 0) {
      where.clientUserId = { notIn: [...blockedIds] };
    }

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
    const laneCode = scope.normalizedCode;
    return records
      .filter((r) => r.professionId === scope.professionId)
      .map((r) => ({
        ...r,
        profession_code: r.profession?.code ?? laneCode,
        client_profile: r.clientUser,
      }));
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
          avatar_url: p?.avatarUrl ?? undefined,
          business_name: biz?.businessName ?? undefined,
          business_number: biz?.businessNumber ?? undefined,
          business_address: biz?.businessAddress ?? undefined,
          about_me: biz?.aboutMe ?? undefined,
          booking_site: biz?.bookingSite ?? undefined,
          social_media: biz?.socialMedia ?? undefined,
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

  async deleteByProfessional(serviceRecordId: string, professionalProfileIdOrProfileId: string) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      professionalProfileIdOrProfileId
    );
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });
    if (!record || record.professionalProfileId !== professionalProfileId) {
      throw new Error("You can only delete your own service records.");
    }
    const createdAt = new Date(record.createdAt);
    const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      throw new Error("You can only delete service records within 7 days.");
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

  async deleteByClient(serviceRecordId: string, professionalProfileIdOrProfileId: string) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      professionalProfileIdOrProfileId
    );
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });
    if (!record || record.professionalProfileId !== professionalProfileId) {
      throw new Error("Unauthorized");
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
