import { prisma } from "./prisma";
import { normalizeProfessionCodeInput } from "./normalizeProfessionCode";

/**
 * Discovery asymmetry (per profession lane):
 *  - Viewer still sees people they blocked on this lane (unblock via profile).
 *  - Viewer does NOT see people who blocked them on this lane.
 */
export async function profileIdsHiddenFromViewer(
  viewerProfileId: string,
  professionCode: string
): Promise<Set<string>> {
  const code = normalizeProfessionCodeInput(professionCode);
  const rows = await prisma.blockedUser.findMany({
    where: { blockedId: viewerProfileId, professionCode: code },
    select: { blockerId: true },
  });
  return new Set(rows.map((r) => r.blockerId));
}

/** `professional_profiles.id` values to omit from map/search for this viewer lane. */
export async function professionalProfileIdsHiddenFromViewer(
  viewerProfileId: string,
  professionCode: string
): Promise<Set<string>> {
  const hiddenProfileIds = await profileIdsHiddenFromViewer(
    viewerProfileId,
    professionCode
  );
  if (hiddenProfileIds.size === 0) return new Set();

  const rows = await prisma.professionalProfile.findMany({
    where: { profileId: { in: [...hiddenProfileIds] } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** True when either party blocked the other on this profession lane. */
export async function isBlockedPairForLane(
  profileA: string,
  profileB: string,
  professionCode: string
): Promise<boolean> {
  const code = normalizeProfessionCodeInput(professionCode);
  const row = await prisma.blockedUser.findFirst({
    where: {
      professionCode: code,
      OR: [
        { blockerId: profileA, blockedId: profileB },
        { blockerId: profileB, blockedId: profileA },
      ],
    },
    select: { id: true },
  });
  return !!row;
}
