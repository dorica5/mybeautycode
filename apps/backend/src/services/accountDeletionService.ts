import { prisma } from "../lib/prisma";
import {
  normalizeProfessionCodeInput,
  professionService,
} from "./professionService";

export type DeleteProfessionalLaneResult = {
  removedProfessionCode: string;
  removedEntireProfessionalProfile: boolean;
};

/**
 * Deletes one `professional_professions` lane (salon/bio/social for that role).
 * If it was the last lane, deletes `professional_profiles` (and cascaded hair/nails child rows).
 */
export async function deleteProfessionalLane(
  profileId: string,
  rawProfessionCode: string
): Promise<DeleteProfessionalLaneResult> {
  const normalized = normalizeProfessionCodeInput(rawProfessionCode);

  const professionalProfile = await prisma.professionalProfile.findUnique({
    where: { profileId },
    select: { id: true },
  });
  if (!professionalProfile) {
    throw Object.assign(new Error("No professional profile for this user."), {
      statusCode: 404 as const,
    });
  }

  let professionId: string;
  try {
    professionId = await professionService.getProfessionIdByCode(normalized);
  } catch {
    throw Object.assign(new Error(`Unknown profession "${rawProfessionCode}".`), {
      statusCode: 400 as const,
    });
  }

  const ppRow = await prisma.professionalProfession.findFirst({
    where: {
      professionalProfileId: professionalProfile.id,
      professionId,
    },
    select: { id: true },
  });
  if (!ppRow) {
    throw Object.assign(
      new Error("That profession is not linked to your professional account."),
      { statusCode: 404 as const }
    );
  }

  const lanesBefore = await prisma.professionalProfession.count({
    where: { professionalProfileId: professionalProfile.id },
  });

  await prisma.$transaction(async (tx) => {
    await tx.clientProfessionalLink.deleteMany({
      where: {
        professionalProfileId: professionalProfile.id,
        professionId,
      },
    });

    const workCodes =
      normalized === "brows_lashes" ? [normalized, "brows"] : [normalized];
    await tx.publicProfileWorkImage.deleteMany({
      where: {
        ownerId: profileId,
        professionCode: { in: workCodes },
      },
    });

    await tx.inspiration.deleteMany({
      where: { ownerId: profileId, professionId },
    });

    await tx.notification.deleteMany({
      where: {
        userId: profileId,
        professionCode: {
          in:
            normalized === "brows_lashes"
              ? ["brows_lashes", "brows"]
              : [normalized],
        },
      },
    });

    await tx.sharedInspiration.deleteMany({
      where: {
        professionId,
        OR: [{ senderUserId: profileId }, { recipientUserId: profileId }],
      },
    });

    if (normalized === "hair") {
      await tx.professionalHairProfile.deleteMany({
        where: { professionalProfileId: professionalProfile.id },
      });
    }
    if (normalized === "nails") {
      await tx.professionalNailsProfile.deleteMany({
        where: { professionalProfileId: professionalProfile.id },
      });
    }

    await tx.professionalProfession.delete({
      where: { id: ppRow.id },
    });

    if (lanesBefore <= 1) {
      await tx.professionalProfile.delete({
        where: { id: professionalProfile.id },
      });
    }
  });

  return {
    removedProfessionCode: normalized,
    removedEntireProfessionalProfile: lanesBefore <= 1,
  };
}
