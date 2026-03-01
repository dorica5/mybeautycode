import { prisma } from "../lib/prisma";

export const relationshipService = {
  async add(hairdresserId: string | string[], clientId: string) {
    const ids = Array.isArray(hairdresserId) ? hairdresserId : [hairdresserId];
    for (const hid of ids) {
      const existing = await prisma.hairdresserClient.findFirst({
        where: { hairdresserId: hid, clientId },
      });
      if (!existing) {
        await prisma.hairdresserClient.create({
          data: { hairdresserId: hid, clientId },
        });
      }
    }
    return { success: true };
  },

  async remove(hairdresserId: string, clientId: string) {
    await prisma.hairdresserClient.deleteMany({
      where: { hairdresserId, clientId },
    });
    return { success: true };
  },

  async checkExists(hairdresserId: string, clientId: string) {
    const existing = await prisma.hairdresserClient.findFirst({
      where: { hairdresserId, clientId },
    });
    return !!existing;
  },

  async listByHairdresser(hairdresserId: string) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { hairdresserId },
      select: { clientId: true, createdAt: true },
    });
    const clientIds = rels.map((r) => r.clientId);
    const blocked = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: hairdresserId }, { blockedId: hairdresserId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    blocked.forEach((b) => {
      if (b.blockerId === hairdresserId) blockedIds.add(b.blockedId);
      else blockedIds.add(b.blockerId);
    });
    const validIds = clientIds.filter((id) => !blockedIds.has(id));
    if (validIds.length === 0) return [];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: validIds } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    return profiles.map((p) => {
      const rel = rels.find((r) => r.clientId === p.id);
      return {
        ...p,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
        lastInteraction: rel?.createdAt,
      };
    });
  },

  async listByClient(clientId: string) {
    const rels = await prisma.hairdresserClient.findMany({
      where: { clientId },
      select: { hairdresserId: true, createdAt: true },
    });
    const hairdresserIds = rels.map((r) => r.hairdresserId);
    const blocked = await prisma.blockedUser.findMany({
      where: { blockedId: clientId },
      select: { blockerId: true },
    });
    const blockerIds = new Set(blocked.map((b) => b.blockerId));
    const available = hairdresserIds.filter((id) => !blockerIds.has(id));
    if (available.length === 0) return [];
    const profiles = await prisma.profile.findMany({
      where: { id: { in: available } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    return profiles.map((p) => {
      const rel = rels.find((r) => r.hairdresserId === p.id);
      return {
        ...p,
        full_name: p.fullName,
        avatar_url: p.avatarUrl,
        lastInteraction: rel?.createdAt,
      };
    });
  },
};
