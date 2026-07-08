import { prisma } from "./prisma";
import { profileDisplayName, splitDisplayName } from "./profileDisplay";

/** Copy client legal name into pro first/last once, when a pro row exists but name is empty. */
export async function ensureProfessionalDisplayNameSeeded(
  profileId: string
): Promise<boolean> {
  const prof = await prisma.professionalProfile.findUnique({
    where: { profileId },
    select: { id: true, displayName: true, firstName: true, lastName: true },
  });
  if (!prof) return false;

  const hasParts =
    Boolean(prof.firstName?.trim()) || Boolean(prof.lastName?.trim());
  if (hasParts) return false;
  if (prof.displayName?.trim()) {
    const split = splitDisplayName(prof.displayName);
    if (split.firstName || split.lastName) {
      await prisma.professionalProfile.update({
        where: { id: prof.id },
        data: {
          firstName: split.firstName,
          lastName: split.lastName,
          updatedAt: new Date(),
        },
      });
      return true;
    }
    return false;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { firstName: true, lastName: true },
  });
  const firstName = profile?.firstName?.trim() || null;
  const lastName = profile?.lastName?.trim() || null;
  const displayName = profileDisplayName({ firstName, lastName });
  if (!displayName) return false;

  await prisma.professionalProfile.update({
    where: { id: prof.id },
    data: {
      firstName,
      lastName,
      displayName,
      updatedAt: new Date(),
    },
  });
  return true;
}
