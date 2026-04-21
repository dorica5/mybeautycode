import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileWithProfessionalForApiInclude } from "../lib/profileIncludes";
import { profileDisplayName } from "../lib/profileDisplay";
import { professionService } from "./professionService";

const nameSearch = (searchQuery: string) => ({
  OR: [
    { firstName: { contains: searchQuery, mode: "insensitive" as const } },
    { lastName: { contains: searchQuery, mode: "insensitive" as const } },
    { username: { contains: searchQuery, mode: "insensitive" as const } },
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

const DISPLAY_NAME_FIELDS = ["displayName"] as const;

/** Salon / bio / social — stored on `professional_professions`, not `professional_profiles`. */
const PROFESSION_BUSINESS_FIELDS = [
  "businessName",
  "businessNumber",
  "businessAddress",
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
  business_address: "businessAddress",
  about_me: "aboutMe",
  social_media: "socialMedia",
  booking_site: "bookingSite",
  /** Legacy mobile payloads → professional_profiles columns */
  salon_name: "businessName",
  salon_phone_number: "businessNumber",
};

export const profileService = {
  async getById(id: string) {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: profileWithProfessionalForApiInclude,
    });
    return profile;
  },

  async hasHairProfession(profileId: string): Promise<boolean> {
    const pp = await prisma.professionalProfile.findUnique({
      where: { profileId },
      select: { id: true },
    });
    if (!pp) return false;
    const link = await prisma.professionalProfession.findFirst({
      where: {
        professionalProfileId: pp.id,
        profession: { code: "hair" },
      },
      select: { id: true },
    });
    return link != null;
  },

  async update(id: string, data: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    const displayNameData: Record<string, unknown> = {};
    const professionBusinessData: Record<string, unknown> = {};
    const body = { ...data };

    let colorBrandUpdate: string | null | undefined;
    if (
      Object.prototype.hasOwnProperty.call(body, "color_brand") ||
      Object.prototype.hasOwnProperty.call(body, "colorBrand")
    ) {
      const raw = body.color_brand ?? body.colorBrand;
      delete body.color_brand;
      delete body.colorBrand;
      if (raw === null) colorBrandUpdate = null;
      else if (typeof raw === "string") colorBrandUpdate = raw.trim() || null;
    }

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
      } else if (
        DISPLAY_NAME_FIELDS.includes(key as (typeof DISPLAY_NAME_FIELDS)[number])
      ) {
        displayNameData[key] = v;
      } else if (
        PROFESSION_BUSINESS_FIELDS.includes(
          key as (typeof PROFESSION_BUSINESS_FIELDS)[number]
        )
      ) {
        professionBusinessData[key] = v;
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

    try {
      const updated = await prisma.profile.update({
        where: { id },
        data: filtered as never,
      });

      const needProfessionalProfile =
        shouldApplyProfession ||
        Object.keys(displayNameData).length > 0 ||
        Object.keys(professionBusinessData).length > 0;

      const profProfileId = needProfessionalProfile
        ? await professionService.getOrCreateProfessionalProfileId(id)
        : null;

      if (shouldApplyProfession && profProfileId) {
        await professionService.ensureProfessionsForProfile(profProfileId, [
          professionCode!,
        ]);
      }

      if (profProfileId && Object.keys(displayNameData).length > 0) {
        displayNameData.updatedAt = new Date();
        await prisma.professionalProfile.update({
          where: { id: profProfileId },
          data: displayNameData as never,
        });
      }

      if (profProfileId && Object.keys(professionBusinessData).length > 0) {
        const codeForBusiness =
          professionCode ??
          (await professionService.getDefaultProfessionCodeForProfessionalProfile(
            profProfileId
          ));
        if (!codeForBusiness) {
          throw Object.assign(
            new Error(
              "Add at least one profession before salon or bio details, or send profession_code with your update."
            ),
            { statusCode: 400 }
          );
        }
        const professionId = await professionService.getProfessionIdByCode(
          codeForBusiness
        );
        professionBusinessData.updatedAt = new Date();
        await prisma.professionalProfession.update({
          where: {
            professionalProfileId_professionId: {
              professionalProfileId: profProfileId,
              professionId,
            },
          },
          data: professionBusinessData as never,
        });
      }

      if (colorBrandUpdate !== undefined) {
        const pp = await prisma.professionalProfile.findUnique({
          where: { profileId: id },
          select: { id: true },
        });
        if (pp) {
          const hasHair = await prisma.professionalProfession.findFirst({
            where: {
              professionalProfileId: pp.id,
              profession: { code: "hair" },
            },
            select: { id: true },
          });
          if (hasHair) {
            await prisma.professionalHairProfile.upsert({
              where: { professionalProfileId: pp.id },
              create: {
                professionalProfileId: pp.id,
                colorBrand: colorBrandUpdate,
              },
              update: {
                colorBrand: colorBrandUpdate,
                updatedAt: new Date(),
              },
            });
          }
        }
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

  async searchClients(
    searchQuery: string,
    professionalProfileId: string,
    professionCode?: string | null
  ) {
    const scope =
      await professionService.resolveActiveProfessionScopeForProfessionalProfile(
        professionalProfileId,
        professionCode
      );
    if (!scope) return [];

    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
        professionId: scope.professionId,
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

  /**
   * Directory of profiles a professional can connect with: optional name filter (`q`).
   * Empty `q` returns up to `take` profiles (sorted by name). Not limited to existing links.
   * Excludes self, blocked users, incomplete setup.
   * `has_relationship` is true when an active `client_professional_links` row exists.
   */
  async searchClientsWithRelationship(
    searchQuery: string,
    professionalProfileId: string,
    professionCode?: string | null
  ) {
    const q = searchQuery.trim();

    const profProfile = await prisma.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { profileId: true },
    });
    const myProfileId = profProfile?.profileId;
    if (!myProfileId) return [];

    const scope =
      await professionService.resolveActiveProfessionScopeForProfessionalProfile(
        professionalProfileId,
        professionCode
      );

    /** Without a resolved lane, do not return a global directory (multi-lane pros would see unrelated profiles). */
    if (!scope) return [];

    let linkedClientIds = new Set<string>();
    let pendingClientIds = new Set<string>();
    const activeRels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
        professionId: scope.professionId,
      },
      select: { clientUserId: true },
    });
    linkedClientIds = new Set(activeRels.map((r) => r.clientUserId));

    const pendingRels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "pending",
        professionId: scope.professionId,
      },
      select: { clientUserId: true },
    });
    pendingClientIds = new Set(pendingRels.map((r) => r.clientUserId));

    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: myProfileId },
      select: { blockedId: true },
    });
    const blockedIds = blocked.map((b) => b.blockedId);

    const profiles = await prisma.profile.findMany({
      where: {
        AND: [
          { id: { not: myProfileId } },
          ...(blockedIds.length > 0 ? [{ id: { notIn: blockedIds } }] : []),
          /** Match profiles not explicitly incomplete (`false`); allows null in older rows. */
          { NOT: { setupStatus: false } },
          ...(q ? [nameSearch(q)] : []),
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
      },
      take: 50,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return profiles.map((p) => ({
      client_id: p.id,
      full_name: profileDisplayName(p),
      avatar_url: p.avatarUrl,
      phone_number: p.phoneNumber,
      has_relationship: linkedClientIds.has(p.id),
      link_pending: pendingClientIds.has(p.id),
    }));
  },

  /**
   * Discovery search for professionals a client might want to connect with.
   *
   * Each profession (hair / nails / brows) is a separate professional account:
   * when a `professionCode` is provided, only pros with that profession account
   * are returned (if a pro has only a hair account, they won't show up in the
   * brows lane). The `has_relationship` / `link_pending` flags reflect the
   * existing link state *in the same profession lane*, so removing a link
   * naturally makes the pro searchable again (until the client re-connects).
   *
   * Blocked users (either direction) are always excluded.
   */
  async searchProfessionalsWithRelationship(
    searchQuery: string,
    clientUserId: string,
    professionCode?: string | null
  ) {
    const normalizedCode = professionCode?.trim() || undefined;
    let professionId: string | undefined;
    if (normalizedCode) {
      professionId = await professionService.getProfessionIdByCode(
        normalizedCode
      );
    }

    // Mutual-block filter: don't surface anyone the client blocked, and don't
    // surface anyone who blocked the client.
    const blocks = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: clientUserId }, { blockedId: clientUserId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedProfileIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === clientUserId) blockedProfileIds.add(b.blockedId);
      else blockedProfileIds.add(b.blockerId);
    }

    // "Pro has this lane" is evidenced by any of:
    //  1. an active (or legacy-null) ProfessionalProfession row for the lane
    //  2. a lane-specific profile row (hair / nails) for the lane
    //  3. any existing ClientProfessionalLink with that professionId
    // This lets us honor the "accounts are independent" rule while still
    // finding pros whose data pre-dates the link-flow materialization below.
    const laneFilter: Prisma.ProfessionalProfileWhereInput | undefined =
      professionId
        ? {
            OR: [
              {
                professionalProfessions: {
                  some: {
                    professionId,
                    OR: [{ isActive: true }, { isActive: null }],
                  },
                },
              },
              ...(normalizedCode === "hair"
                ? [{ professionalHairProfile: { isNot: null } as const }]
                : []),
              ...(normalizedCode === "nails"
                ? [{ professionalNailsProfile: { isNot: null } as const }]
                : []),
              {
                clientProfessionalLinks: {
                  some: { professionId },
                },
              },
            ],
          }
        : undefined;

    const profProfiles = await prisma.professionalProfile.findMany({
      where: {
        // Don't surface yourself in a client-side search.
        profileId: { not: clientUserId },
        profile: nameSearch(searchQuery),
        ...(laneFilter ?? {}),
      },
      include: {
        profile: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    const visible = profProfiles.filter(
      (pp) => !blockedProfileIds.has(pp.profileId)
    );
    if (visible.length === 0) return [];

    // Annotate each result with the existing link state for this client
    // (scoped to the chosen lane when provided).
    const links = await prisma.clientProfessionalLink.findMany({
      where: {
        clientUserId,
        professionalProfileId: { in: visible.map((pp) => pp.id) },
        ...(professionId ? { professionId } : {}),
      },
      select: { professionalProfileId: true, status: true },
    });
    const activeProIds = new Set<string>();
    const pendingProIds = new Set<string>();
    for (const l of links) {
      if (l.status === "active") activeProIds.add(l.professionalProfileId);
      else if (l.status === "pending") pendingProIds.add(l.professionalProfileId);
    }

    return visible.map((pp) => ({
      professional_profile_id: pp.id,
      profile_id: pp.profileId,
      hairdresser_id: pp.profileId,
      full_name: pp.displayName ?? profileDisplayName(pp.profile),
      avatar_url: pp.profile.avatarUrl,
      has_relationship: activeProIds.has(pp.id),
      link_pending: pendingProIds.has(pp.id),
    }));
  },
};
