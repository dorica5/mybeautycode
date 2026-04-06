import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";
import { professionService } from "./professionService";
import { notificationService } from "./notificationService";

export const relationshipService = {
  /**
   * Professional initiates a client link: `client_professional_links` row with status `pending`
   * and a `link_request` notification to the client. Idempotent if already pending.
   */
  async requestClientLink(hairdresserProfileUserId: string, clientUserId: string) {
    const professionalProfileId =
      await professionService.getOrCreateProfessionalProfileId(hairdresserProfileUserId);

    const prof = await prisma.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { profileId: true },
    });
    if (!prof?.profileId) {
      throw new Error("Professional profile not found");
    }
    if (prof.profileId === clientUserId) {
      throw Object.assign(new Error("Cannot link to yourself"), { statusCode: 400 });
    }

    const existing = await prisma.clientProfessionalLink.findFirst({
      where: { professionalProfileId, clientUserId },
    });

    if (existing?.status === "active") {
      throw Object.assign(new Error("Already connected"), { statusCode: 409 });
    }
    if (existing?.status === "pending") {
      return {
        success: true,
        clientProfessionalLinkId: existing.id,
        alreadyPending: true,
      };
    }
    if (existing?.status === "blocked") {
      throw Object.assign(new Error("Cannot send request"), { statusCode: 403 });
    }

    let linkId: string;
    if (existing?.status === "archived") {
      await prisma.clientProfessionalLink.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          createdByUserId: prof.profileId,
          updatedAt: new Date(),
          statusChangedAt: new Date(),
        },
      });
      linkId = existing.id;
    } else {
      const created = await prisma.clientProfessionalLink.create({
        data: {
          professionalProfileId,
          clientUserId,
          status: "pending",
          createdByUserId: prof.profileId,
        },
      });
      linkId = created.id;
    }

    const proProfile = await prisma.profile.findUnique({
      where: { id: prof.profileId },
      select: { firstName: true, lastName: true },
    });
    const proName = profileDisplayName(proProfile ?? {});

    await notificationService.send(prof.profileId, clientUserId, {
      type: "FRIEND_REQUEST",
      message: `${proName} wants to connect with you on MyHaircode`,
      title: "Connection request",
      extraData: {
        clientProfessionalLinkId: linkId,
        isClient: false,
      },
    });

    return { success: true, clientProfessionalLinkId: linkId };
  },

  async add(professionalProfileIdOrProfileId: string | string[], clientUserId: string) {
    const ids = Array.isArray(professionalProfileIdOrProfileId)
      ? professionalProfileIdOrProfileId
      : [professionalProfileIdOrProfileId];

    for (const id of ids) {
      const professionalProfileId = id.length === 36 && id.includes("-")
        ? await professionService.getOrCreateProfessionalProfileId(id)
        : id;

      const existing = await prisma.clientProfessionalLink.findFirst({
        where: {
          professionalProfileId,
          clientUserId,
        },
      });
      if (!existing) {
        await prisma.clientProfessionalLink.create({
          data: {
            professionalProfileId,
            clientUserId,
            status: "active",
            createdByUserId: clientUserId,
          },
        });
      }
    }
    return { success: true };
  },

  async remove(professionalProfileId: string, clientUserId: string) {
    await prisma.clientProfessionalLink.deleteMany({
      where: { professionalProfileId, clientUserId },
    });
    return { success: true };
  },

  async checkExists(professionalProfileIdOrProfileId: string, clientUserId: string) {
    const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
      professionalProfileIdOrProfileId
    );
    const existing = await prisma.clientProfessionalLink.findFirst({
      where: {
        professionalProfileId,
        clientUserId,
        status: "active",
      },
    });
    return !!existing;
  },

  async listByProfessional(professionalProfileId: string) {
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        professionalProfileId,
        status: "active",
      },
      select: { clientUserId: true, createdAt: true },
    });
    const clientIds = rels.map((r) => r.clientUserId);
    const profProfile = await prisma.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { profileId: true },
    });
    const profileId = profProfile?.profileId;
    if (!profileId || clientIds.length === 0) return [];

    const blocked = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: profileId }, { blockedId: profileId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    blocked.forEach((b) => {
      if (b.blockerId === profileId) blockedIds.add(b.blockedId);
      else blockedIds.add(b.blockerId);
    });
    const validIds = clientIds.filter((id) => !blockedIds.has(id));
    if (validIds.length === 0) return [];

    const profiles = await prisma.profile.findMany({
      where: { id: { in: validIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    return profiles.map((p) => {
      const rel = rels.find((r) => r.clientUserId === p.id);
      return {
        ...p,
        full_name: profileDisplayName(p),
        avatar_url: p.avatarUrl,
        lastInteraction: rel?.createdAt,
      };
    });
  },

  /** For professional UI: link row with this client, if any. */
  async getClientLinkUiState(
    hairdresserUserId: string,
    clientUserId: string
  ): Promise<"none" | "pending" | "active"> {
    const professionalProfileId =
      await professionService.getOrCreateProfessionalProfileId(hairdresserUserId);
    const link = await prisma.clientProfessionalLink.findFirst({
      where: { professionalProfileId, clientUserId },
      select: { status: true },
    });
    if (!link) return "none";
    if (link.status === "active") return "active";
    if (link.status === "pending") return "pending";
    return "none";
  },

  async listByClient(clientUserId: string) {
    const rels = await prisma.clientProfessionalLink.findMany({
      where: {
        clientUserId,
        status: "active",
      },
      select: { professionalProfileId: true, createdAt: true },
    });
    const profProfileIds = rels.map((r) => r.professionalProfileId);
    const blocked = await prisma.blockedUser.findMany({
      where: { blockedId: clientUserId },
      select: { blockerId: true },
    });
    const blockerIds = new Set(blocked.map((b) => b.blockerId));

    const profProfiles = await prisma.professionalProfile.findMany({
      where: { id: { in: profProfileIds } },
      include: {
        profile: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
    const available = profProfiles.filter((pp) => !blockerIds.has(pp.profileId));
    return available.map((pp) => {
      const rel = rels.find((r) => r.professionalProfileId === pp.id);
      return {
        id: pp.profile.id,
        full_name: pp.displayName ?? profileDisplayName(pp.profile),
        avatar_url: pp.profile.avatarUrl,
        lastInteraction: rel?.createdAt,
      };
    });
  },
};
