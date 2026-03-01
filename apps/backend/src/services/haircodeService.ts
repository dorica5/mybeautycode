import { prisma } from "../lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const haircodeService = {
  async listClientHaircodes(clientId: string) {
    const haircodes = await prisma.haircode.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    const hairdresserIds = [...new Set(haircodes.map((h) => h.hairdresserId))];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: hairdresserIds } },
    });
    return haircodes.map((h) => {
      const p = profiles.find((prof) => prof.id === h.hairdresserId);
      return {
        id: h.id,
        created_at: h.createdAt?.toISOString(),
        client_id: h.clientId,
        hairdresser_id: h.hairdresserId,
        hairdresser_name: h.hairdresserName,
        service_description: h.serviceDescription,
        services: h.services,
        price: h.price,
        duration: h.duration,
        hairdresser_profile: p
          ? {
              avatar_url: p.avatarUrl,
              salon_name: p.salonName,
              salon_phone_number: p.salonPhoneNumber,
              about_me: p.aboutMe,
              booking_site: p.bookingSite,
              social_media: p.socialMedia,
            }
          : null,
      };
    });
  },

  async listLatestHaircodes(hairdresserId: string) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { hairdresserId },
      select: { clientId: true },
    });
    const activeClientIds = rels.map((r) => r.clientId);

    const blocking = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: hairdresserId }, { blockedId: hairdresserId }],
      },
    });
    const blockedIds = new Set<string>();
    blocking.forEach((b) => {
      if (b.blockerId === hairdresserId) blockedIds.add(b.blockedId);
      else blockedIds.add(b.blockerId);
    });
    const validClientIds = activeClientIds.filter((id) => !blockedIds.has(id));
    if (validClientIds.length === 0) return [];

    const haircodes = await prisma.haircode.findMany({
      where: {
        hairdresserId,
        clientId: { in: validClientIds },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const clientIds = [...new Set(haircodes.map((h) => h.clientId))];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: clientIds } },
    });
    return haircodes.map((h) => ({
      ...h,
      client_profile: profiles.find((p) => p.id === h.clientId) ?? null,
    }));
  },

  async getWithMedia(haircodeId: string) {
    const haircode = await prisma.haircode.findUnique({
      where: { id: haircodeId },
    });
    if (!haircode) return null;
    const media = await prisma.haircodeMedia.findMany({
      where: { haircodeId },
      select: { mediaUrl: true, mediaType: true, haircodeId: true },
    });
    return { ...haircode, media };
  },

  async getMedia(haircodeId: string) {
    return prisma.haircodeMedia.findMany({
      where: { haircodeId },
      select: { mediaUrl: true, mediaType: true, haircodeId: true },
    });
  },

  async listClientGallery(clientId: string) {
    const haircodes = await prisma.haircode.findMany({
      where: { clientId },
      select: { id: true },
    });
    const ids = haircodes.map((h) => h.id);
    if (ids.length === 0) return [];
    const media = await prisma.haircodeMedia.findMany({
      where: { haircodeId: { in: ids } },
      select: { haircodeId: true, mediaUrl: true, mediaType: true },
      orderBy: { createdAt: "desc" },
    });
    return media.map((m) => ({
      haircode_id: m.haircodeId,
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
  }) {
    return prisma.haircode.create({
      data: {
        clientId: data.client_id,
        hairdresserId: data.hairdresser_id,
        hairdresserName: data.hairdresser_name,
        serviceDescription: data.service_description,
        services: data.services,
        price: data.price,
        duration: data.duration,
      },
    });
  },

  async update(haircodeId: string, data: Record<string, unknown>) {
    return prisma.haircode.update({
      where: { id: haircodeId },
      data: {
        serviceDescription: (data.service_description as string) ?? undefined,
        services: (data.services as string) ?? undefined,
        price: (data.price as string) ?? undefined,
        duration: (data.duration as string) ?? undefined,
      },
    });
  },

  async deleteHairdresser(haircodeId: string, hairdresserId: string) {
    const haircode = await prisma.haircode.findUnique({
      where: { id: haircodeId },
    });
    if (!haircode || haircode.hairdresserId !== hairdresserId) {
      throw new Error("You can only delete your own haircodes.");
    }
    const createdAt = new Date(haircode.createdAt);
    const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      throw new Error("You can only delete haircodes within 7 days.");
    }
    const media = await prisma.haircodeMedia.findMany({
      where: { haircodeId },
      select: { mediaUrl: true },
    });
    if (media.length > 0) {
      await supabase.storage
        .from("haircode_images")
        .remove(media.map((m) => m.mediaUrl));
    }
    await prisma.haircodeMedia.deleteMany({ where: { haircodeId } });
    await prisma.haircode.delete({ where: { id: haircodeId } });
    return { success: true };
  },

  async deleteClient(haircodeId: string, hairdresserId: string) {
    const haircode = await prisma.haircode.findUnique({
      where: { id: haircodeId },
    });
    if (!haircode || haircode.hairdresserId !== hairdresserId) {
      throw new Error("Unauthorized");
    }
    const media = await prisma.haircodeMedia.findMany({
      where: { haircodeId },
      select: { mediaUrl: true },
    });
    if (media.length > 0) {
      await supabase.storage
        .from("haircode_images")
        .remove(media.map((m) => m.mediaUrl));
    }
    await prisma.haircodeMedia.deleteMany({ where: { haircodeId } });
    await prisma.haircode.delete({ where: { id: haircodeId } });
    return { success: true };
  },

  async insertMedia(records: { haircode_id: string; media_url: string; media_type: string }[]) {
    return prisma.haircodeMedia.createMany({
      data: records.map((r) => ({
        haircodeId: r.haircode_id,
        mediaUrl: r.media_url,
        mediaType: r.media_type,
      })),
    });
  },

  async deleteMediaItems(haircodeId: string, mediaUrls: string[]) {
    for (const url of mediaUrls) {
      await supabase.storage.from("haircode_images").remove([url]);
    }
    for (const url of mediaUrls) {
      await prisma.haircodeMedia.deleteMany({
        where: { haircodeId, mediaUrl: url },
      });
    }
  },

  async deleteAllMedia(haircodeId: string) {
    await prisma.haircodeMedia.deleteMany({ where: { haircodeId } });
  },
};
