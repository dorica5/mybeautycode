import { prisma } from "../lib/prisma";
import { professionService } from "./professionService";

const PROFILE_FIELDS = [
  "fullName",
  "avatarUrl",
  "phoneNumber",
  "setupStatus",
  "signupDate",
  "updatedAt",
] as const;

const PROFESSIONAL_FIELDS = [
  "displayName",
  "businessName",
  "businessNumber",
  "aboutMe",
  "socialMedia",
  "bookingSite",
] as const;

const SNAKE_TO_CAMEL: Record<string, string> = {
  full_name: "fullName",
  avatar_url: "avatarUrl",
  phone_number: "phoneNumber",
  setup_status: "setupStatus",
  signup_date: "signupDate",
  updated_at: "updatedAt",
  display_name: "displayName",
  business_name: "businessName",
  business_number: "businessNumber",
  about_me: "aboutMe",
  social_media: "socialMedia",
  booking_site: "bookingSite",
};

export const profileService = {
  async getById(id: string) {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { professionalProfile: true },
    });
    return profile;
  },

  async update(id: string, data: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    const professionalData: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(data)) {
      const key = (SNAKE_TO_CAMEL[k] ?? k) as string;
      if (PROFILE_FIELDS.includes(key as (typeof PROFILE_FIELDS)[number])) {
        filtered[key] = v;
      } else if (PROFESSIONAL_FIELDS.includes(key as (typeof PROFESSIONAL_FIELDS)[number])) {
        professionalData[key] = v;
      }
    }
    filtered.updatedAt = new Date();

    if (Object.keys(professionalData).length > 0) {
      const profProfileId = await professionService.getOrCreateProfessionalProfileId(id);
      professionalData.updatedAt = new Date();
      await prisma.professionalProfile.update({
        where: { id: profProfileId },
        data: professionalData as never,
      });
    }

    return prisma.profile.update({
      where: { id },
      data: filtered as never,
    });
  },

  async searchClients(searchQuery: string, professionalProfileId: string) {
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
      },
      select: { clientUserId: true },
    });
    const clientIds = rels.map((r) => r.clientUserId);
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
    professionalProfileId: string
  ) {
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
      },
      select: { clientUserId: true },
    });
    const clientIds = rels.map((r) => r.clientUserId);
    if (clientIds.length === 0) return [];

    const profProfile = await prisma.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { profileId: true },
    });
    const profileId = profProfile?.profileId;
    if (!profileId) return [];

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: profileId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocked.map((b) => b.blockedId));
    const validClientIds = clientIds.filter((id) => !blockedIds.has(id));
    if (validClientIds.length === 0) return [];

    const profiles = await prisma.profile.findMany({
      where: {
        id: { in: validClientIds },
        fullName: { contains: searchQuery, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
    });

    return profiles.map((p) => ({
      client_id: p.id,
      full_name: p.fullName,
      avatar_url: p.avatarUrl,
      phone_number: p.phoneNumber,
      has_relationship: true,
    }));
  },

  async searchProfessionalsWithRelationship(
    searchQuery: string,
    clientUserId: string
  ) {
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        clientUserId,
        status: "active",
      },
      select: { professionalProfileId: true },
    });
    const profProfileIds = rels.map((r) => r.professionalProfileId);
    if (profProfileIds.length === 0) return [];

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: clientUserId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocked.map((b) => b.blockedId));

    const profProfiles = await prisma.professionalProfile.findMany({
      where: {
        id: { in: profProfileIds },
        profile: {
          fullName: { contains: searchQuery, mode: "insensitive" },
        },
      },
      include: { profile: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    const valid = profProfiles.filter((pp) => !blockedIds.has(pp.profileId));
    return valid.map((pp) => ({
      professional_profile_id: pp.id,
      profile_id: pp.profileId,
      full_name: pp.displayName ?? pp.profile.fullName,
      avatar_url: pp.profile.avatarUrl,
      has_relationship: true,
    }));
  },
};
