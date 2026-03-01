import { prisma } from "../lib/prisma";

export const profileService = {
  async getById(id: string) {
    return prisma.profile.findUnique({
      where: { id },
    });
  },

  async update(id: string, data: Record<string, unknown>) {
    const snakeToCamel: Record<string, string> = {
      full_name: "fullName",
      avatar_url: "avatarUrl",
      phone_number: "phoneNumber",
      salon_phone_number: "salonPhoneNumber",
      salon_name: "salonName",
      about_me: "aboutMe",
      social_media: "socialMedia",
      booking_site: "bookingSite",
      hair_structure: "hairStructure",
      hair_thickness: "hairThickness",
      grey_hair_percentage: "greyHairPercentage",
      natural_hair_color: "naturalHairColor",
      updated_at: "updatedAt",
      signup_date: "signupDate",
    };
    const allowed = new Set([
      ...Object.keys(snakeToCamel),
      "fullName",
      "avatarUrl",
      "phoneNumber",
      "salonName",
      "aboutMe",
      "updatedAt",
      "signupDate",
    ]);
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      const key = snakeToCamel[k] ?? k;
      if (allowed.has(k) || allowed.has(key)) {
        filtered[key] = v;
      }
    }
    filtered.updatedAt = new Date();
    return prisma.profile.update({
      where: { id },
      data: filtered as never,
    });
  },

  async searchClients(searchQuery: string, hairdresserId: string) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { hairdresserId },
      select: { clientId: true },
    });
    const clientIds = rels.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    const profiles = await prisma.profile.findMany({
      where: {
        id: { in: clientIds },
        fullName: { contains: searchQuery, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
    });
    return profiles;
  },

  async searchClientsWithRelationship(
    searchQuery: string,
    hairdresserId: string
  ) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { hairdresserId },
      select: { clientId: true },
    });
    const clientIds = rels.map((r) => r.clientId);

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: hairdresserId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocked.map((b) => b.blockedId));

    const profiles = await prisma.profile.findMany({
      where: {
        fullName: { contains: searchQuery, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
    });

    return profiles
      .filter((p) => !blockedIds.has(p.id))
      .map((p) => ({
        client_id: p.id,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
        phone_number: p.phoneNumber,
        has_relationship: clientIds.includes(p.id),
      }));
  },

  async searchHairdressersWithRelationship(
    searchQuery: string,
    clientId: string
  ) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { clientId },
      select: { hairdresserId: true },
    });
    const hairdresserIds = rels.map((r) => r.hairdresserId);

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: clientId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocked.map((b) => b.blockedId));

    const profiles = await prisma.profile.findMany({
      where: {
        userType: "HAIRDRESSER",
        fullName: { contains: searchQuery, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    return profiles
      .filter((p) => !blockedIds.has(p.id))
      .map((p) => ({
        hairdresser_id: p.id,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
        has_relationship: hairdresserIds.includes(p.id),
      }));
  },
};
