import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";
import { createClient } from "@supabase/supabase-js";
import { professionService } from "./professionService";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const haircodeService = {
  async listClientHaircodes(clientUserId: string, professionCode?: string) {
    const where: { clientUserId: string; professionId?: string } = {
      clientUserId,
    };
    if (professionCode?.trim()) {
      where.professionId = await professionService.getProfessionIdByCode(
        professionCode.trim()
      );
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        professionalProfile: {
          include: { profile: true },
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
      const profPayload = pp
        ? {
            avatar_url: p?.avatarUrl,
            business_name: pp.businessName,
            business_number: pp.businessNumber,
            business_address: pp.businessAddress,
            about_me: pp.aboutMe,
            booking_site: pp.bookingSite,
            social_media: pp.socialMedia,
            salon_name: pp.businessName ?? pp.displayName ?? undefined,
            salon_phone_number: pp.businessNumber ?? undefined,
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

  async listLatestHaircodes(professionalProfileIdOrProfileId: string) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      professionalProfileIdOrProfileId
    );
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
      },
      select: { clientUserId: true },
    });
    const activeClientIds = rels.map((r) => r.clientUserId);

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
    const validClientIds = activeClientIds.filter((id) => !blockedIds.has(id));
    if (validClientIds.length === 0) return [];

    const records = await prisma.serviceRecord.findMany({
      where: {
        professionalProfileId,
        clientUserId: { in: validClientIds },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        clientUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
    return records.map((r) => ({
      ...r,
      client_profile: r.clientUser,
    }));
  },

  async getWithMedia(serviceRecordId: string) {
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: {
        profession: { select: { code: true } },
        professionalProfile: {
          select: {
            professionalProfessions: {
              where: { isActive: true },
              select: { profession: { select: { code: true } } },
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
    return { ...record, media };
  },

  async getMedia(serviceRecordId: string) {
    return prisma.serviceRecordMedia.findMany({
      where: { serviceRecordId },
      select: { mediaUrl: true, mediaType: true, serviceRecordId: true },
    });
  },

  async listClientGallery(clientUserId: string, professionCode?: string) {
    const where: { clientUserId: string; professionId?: string } = {
      clientUserId,
    };
    if (professionCode?.trim()) {
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
    /** Profession for this visit (e.g. active surface when logging). Defaults to hair for old clients. */
    profession_code?: string;
  }) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      data.hairdresser_id
    );
    const code =
      typeof data.profession_code === "string" && data.profession_code.trim()
        ? data.profession_code.trim()
        : "hair";
    const professionId = await professionService.getProfessionIdByCode(code);

    const link = await prisma.clientProfessionalLink.findFirst({
      where: {
        clientUserId: data.client_id,
        professionalProfileId,
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
