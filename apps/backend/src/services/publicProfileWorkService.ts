import { prisma } from "../lib/prisma";

const MAX_IMAGES = 6;

/** Allowed `profession_code` values (matches mobile / professional professions). */
const ALLOWED_PROFESSION = new Set([
  "hair",
  "brows_lashes",
  "nails",
  "esthetician",
]);

function normalizeProfession(code: string): string {
  return String(code ?? "")
    .trim()
    .toLowerCase();
}

export const publicProfileWorkService = {
  async listForOwner(ownerId: string, professionCode: string) {
    const prof = normalizeProfession(professionCode) || "hair";
    return prisma.publicProfileWorkImage.findMany({
      where: { ownerId, professionCode: prof },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        imageUrl: true,
        lowResImageUrl: true,
        professionCode: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  },

  async addForOwner(
    ownerId: string,
    professionCode: string,
    imageUrl: string,
    lowResImageUrl?: string | null
  ) {
    const prof = normalizeProfession(professionCode);
    if (!ALLOWED_PROFESSION.has(prof)) {
      throw Object.assign(new Error("Invalid profession_code."), {
        statusCode: 400,
      });
    }
    const path = String(imageUrl ?? "").trim();
    if (!path) {
      throw Object.assign(new Error("image_url required."), {
        statusCode: 400,
      });
    }

    const count = await prisma.publicProfileWorkImage.count({
      where: { ownerId, professionCode: prof },
    });
    if (count >= MAX_IMAGES) {
      throw Object.assign(
        new Error(`You can add at most ${MAX_IMAGES} public work images per profession.`),
        { statusCode: 400 }
      );
    }

    const agg = await prisma.publicProfileWorkImage.aggregate({
      where: { ownerId, professionCode: prof },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    return prisma.publicProfileWorkImage.create({
      data: {
        ownerId,
        professionCode: prof,
        imageUrl: path,
        lowResImageUrl: lowResImageUrl?.trim() || null,
        sortOrder,
      },
      select: {
        id: true,
        imageUrl: true,
        lowResImageUrl: true,
        professionCode: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  },

  async deleteForOwner(ownerId: string, imageId: string) {
    const row = await prisma.publicProfileWorkImage.findFirst({
      where: { id: imageId, ownerId },
    });
    if (!row) {
      throw Object.assign(new Error("Image not found."), { statusCode: 404 });
    }
    await prisma.publicProfileWorkImage.delete({ where: { id: imageId } });
    return { success: true as const };
  },
};
