import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { professionService } from "./professionService";

/** Strip legacy public/signed URL to object path (same idea as mobile `normalizeStorageObjectPath`). */
function normalizeHaircodeStoragePath(urlOrPath: string): string {
  const s = urlOrPath.trim();
  if (!s || !s.startsWith("http")) return s;
  const pub = `/object/public/haircode_images/`;
  const sign = `/object/sign/haircode_images/`;
  let i = s.indexOf(pub);
  if (i >= 0) {
    return decodeURIComponent(s.slice(i + pub.length).split("?")[0] ?? "") || s;
  }
  i = s.indexOf(sign);
  if (i >= 0) {
    return decodeURIComponent(s.slice(i + sign.length).split("?")[0] ?? "") || s;
  }
  return s;
}

async function isBlockedPair(aProfileId: string, bProfileId: string): Promise<boolean> {
  const row = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: aProfileId, blockedId: bProfileId },
        { blockerId: bProfileId, blockedId: aProfileId },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

export const serviceRecordAccessService = {
  /**
   * Client may read their visits. Professionals may read if they created the visit,
   * or have an active link with the same client (and no block with that client).
   */
  async canAccessServiceRecord(
    viewerProfileId: string,
    record: {
      clientUserId: string;
      professionalProfileId: string | null;
      professionId?: string | null;
    }
  ): Promise<boolean> {
    if (record.clientUserId === viewerProfileId) return true;

    if (await isBlockedPair(viewerProfileId, record.clientUserId)) {
      return false;
    }

    const viewerPP = await prisma.professionalProfile.findUnique({
      where: { profileId: viewerProfileId },
      select: { id: true },
    });
    if (!viewerPP) return false;

    if (record.professionalProfileId && record.professionalProfileId === viewerPP.id) {
      if (!record.professionId) return false;
      const link = await prisma.clientProfessionalLink.findFirst({
        where: {
          clientUserId: record.clientUserId,
          professionalProfileId: viewerPP.id,
          professionId: record.professionId,
          status: "active",
        },
        select: { id: true },
      });
      return !!link;
    }

    const linkWhere: Prisma.ClientProfessionalLinkWhereInput = {
      clientUserId: record.clientUserId,
      professionalProfileId: viewerPP.id,
      status: "active",
    };
    if (record.professionId) {
      linkWhere.professionId = record.professionId;
    }
    const link = await prisma.clientProfessionalLink.findFirst({
      where: linkWhere,
      select: { id: true },
    });
    return !!link;
  },

  async assertCanAccessServiceRecord(
    viewerProfileId: string,
    serviceRecordId: string
  ): Promise<void> {
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: {
        clientUserId: true,
        professionalProfileId: true,
        professionId: true,
      },
    });
    if (!record) {
      throw Object.assign(new Error("Service record not found"), {
        statusCode: 404 as const,
      });
    }
    const ok = await this.canAccessServiceRecord(viewerProfileId, record);
    if (!ok) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }
  },

  /** Caller may see this client's visit list / gallery: self or an active linked professional (not blocked). */
  async assertCanAccessClientTimeline(
    viewerProfileId: string,
    clientUserId: string,
    options?: { professionCode?: string | null }
  ): Promise<void> {
    if (viewerProfileId === clientUserId) return;

    if (await isBlockedPair(viewerProfileId, clientUserId)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }

    const viewerPP = await prisma.professionalProfile.findUnique({
      where: { profileId: viewerProfileId },
      select: { id: true },
    });
    if (!viewerPP) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }

    const scope =
      await professionService.resolveActiveProfessionScopeForProfessionalProfile(
        viewerPP.id,
        options?.professionCode
      );
    if (!scope) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }

    const linkWhere: Prisma.ClientProfessionalLinkWhereInput = {
      clientUserId,
      professionalProfileId: viewerPP.id,
      status: "active",
      professionId: scope.professionId,
    };

    const link = await prisma.clientProfessionalLink.findFirst({
      where: linkWhere,
      select: { id: true },
    });
    if (!link) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }
  },

  /**
   * `mediaUrl` in DB is the storage object path for bucket haircode_images.
   */
  async assertCanReadHaircodeImage(
    viewerProfileId: string,
    storagePath: string
  ): Promise<void> {
    const alt = normalizeHaircodeStoragePath(storagePath);
    const pathVariants = [...new Set([storagePath, alt].filter((p) => Boolean(p?.trim())))];
    const media = await prisma.serviceRecordMedia.findFirst({
      where: { mediaUrl: { in: pathVariants } },
      select: {
        serviceRecord: {
          select: {
            clientUserId: true,
            professionalProfileId: true,
            professionId: true,
          },
        },
      },
    });
    if (!media?.serviceRecord) {
      throw Object.assign(new Error("Object not found or not a visit image"), {
        statusCode: 403 as const,
      });
    }
    const ok = await this.canAccessServiceRecord(
      viewerProfileId,
      media.serviceRecord
    );
    if (!ok) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }
  },

  /** Only the professional who owns the visit may attach or remove media. */
  async assertProfessionalOwnsVisit(
    viewerProfileId: string,
    serviceRecordId: string
  ): Promise<void> {
    const viewerPP = await prisma.professionalProfile.findUnique({
      where: { profileId: viewerProfileId },
      select: { id: true },
    });
    if (!viewerPP) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }
    const record = await prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      select: { professionalProfileId: true },
    });
    if (!record || record.professionalProfileId !== viewerPP.id) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 as const });
    }
  },
};
