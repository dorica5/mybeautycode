import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";
import { professionService } from "./professionService";

const nameSearch = (searchQuery: string) => ({
  OR: [
    { firstName: { contains: searchQuery, mode: "insensitive" as const } },
    { lastName: { contains: searchQuery, mode: "insensitive" as const } },
  ],
});

const PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "username",
  "country",
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
  first_name: "firstName",
  last_name: "lastName",
  username: "username",
  country: "country",
  avatar_url: "avatarUrl",
  phone_number: "phoneNumber",
  setup_status: "setupStatus",
  signup_date: "signupDate",
  updated_at: "updatedAt",
  display_name: "displayName",
  business_name: "businessName",
  business_number: "businessNumber",
  /** Mobile uses salon_*; same columns as businessName / businessNumber on professional_profiles. */
  salon_name: "businessName",
  salon_phone_number: "businessNumber",
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
    const body = { ...data };

    const professionCodeRaw =
      body.profession_code ?? body.professionCode ?? null;
    const professionCode =
      typeof professionCodeRaw === "string" && professionCodeRaw.trim()
        ? professionCodeRaw.trim()
        : null;
    delete body.profession_code;
    delete body.professionCode;

    /** Only persist profession when finishing professional onboarding in one request (with setup complete). */
    const completingSetup =
      data.setup_status === true || data.setupStatus === true;
    const shouldApplyProfession = Boolean(professionCode && completingSetup);

    if (shouldApplyProfession) {
      await professionService.getProfessionIdByCode(professionCode!);
    }

    const legacyFull = body.full_name ?? body.fullName;
    if (
      typeof legacyFull === "string" &&
      legacyFull.trim() &&
      body.first_name == null &&
      body.firstName == null &&
      body.last_name == null &&
      body.lastName == null
    ) {
      const t = legacyFull.trim();
      const space = t.indexOf(" ");
      body.first_name = space === -1 ? t : t.slice(0, space);
      const rest = space === -1 ? null : t.slice(space + 1).trim();
      body.last_name = rest && rest.length > 0 ? rest : null;
    }

    for (const [k, v] of Object.entries(body)) {
      const key = (SNAKE_TO_CAMEL[k] ?? k) as string;
      if (PROFILE_FIELDS.includes(key as (typeof PROFILE_FIELDS)[number])) {
        filtered[key] = v;
      } else if (PROFESSIONAL_FIELDS.includes(key as (typeof PROFESSIONAL_FIELDS)[number])) {
        professionalData[key] = v;
      }
    }
    filtered.updatedAt = new Date();

    if (Object.prototype.hasOwnProperty.call(filtered, "username")) {
      const u = filtered.username;
      if (u === "" || u === null || u === undefined) {
        filtered.username = null;
      } else if (typeof u === "string") {
        const raw = u.trim().toLowerCase();
        // Lowercase only, 3–30 chars, typical handle: letter first, then letters/digits/underscore.
        if (!/^[a-z][a-z0-9_]{2,29}$/.test(raw)) {
          throw Object.assign(
            new Error(
              "Username must be 3–30 characters: lowercase letters, numbers, and underscores only. It must start with a letter."
            ),
            { statusCode: 400 }
          );
        }
        const taken = await prisma.profile.findFirst({
          where: { username: raw, id: { not: id } },
          select: { id: true },
        });
        if (taken) {
          throw Object.assign(
            new Error("This username is already taken."),
            { statusCode: 409 }
          );
        }
        filtered.username = raw;
      }
    }

    if (Object.keys(professionalData).length > 0) {
      const profProfileId = await professionService.getOrCreateProfessionalProfileId(id);
      professionalData.updatedAt = new Date();
      await prisma.professionalProfile.update({
        where: { id: profProfileId },
        data: professionalData as never,
      });
    }

    try {
      const updated = await prisma.profile.update({
        where: { id },
        data: filtered as never,
      });

      if (shouldApplyProfession) {
        const profProfileId =
          await professionService.getOrCreateProfessionalProfileId(id);
        await professionService.replaceProfessionsForProfile(profProfileId, [
          professionCode!,
        ]);
      }

      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          const targets = (e.meta?.target as string[] | undefined) ?? [];
          const t = targets.join(" ").toLowerCase();
          const raw = (e.message ?? "").toLowerCase();
          if (
            t.includes("phone_number") ||
            t.includes("phonenumber") ||
            raw.includes("phone_number")
          ) {
            throw Object.assign(
              new Error("This phone number is already in use."),
              { statusCode: 409 }
            );
          }
          if (t.includes("username") || raw.includes("username")) {
            throw Object.assign(
              new Error("This username is already taken."),
              { statusCode: 409 }
            );
          }
        }
        if (e.code === "P2025") {
          throw Object.assign(new Error("Profile not found."), {
            statusCode: 404,
          });
        }
      }
      throw e;
    }
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
        ...nameSearch(searchQuery),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
    });
    return profiles.map((p) => ({
      ...p,
      full_name: profileDisplayName(p),
    }));
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
        ...nameSearch(searchQuery),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
    });

    return profiles.map((p) => ({
      client_id: p.id,
      full_name: profileDisplayName(p),
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
        profile: nameSearch(searchQuery),
      },
      include: {
        profile: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    const valid = profProfiles.filter((pp) => !blockedIds.has(pp.profileId));
    return valid.map((pp) => ({
      professional_profile_id: pp.id,
      profile_id: pp.profileId,
      full_name: pp.displayName ?? profileDisplayName(pp.profile),
      avatar_url: pp.profile.avatarUrl,
      has_relationship: true,
    }));
  },
};
