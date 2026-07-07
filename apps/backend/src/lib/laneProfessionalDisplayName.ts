import { prisma } from "./prisma";
import { normalizeProfessionCodeInput } from "./normalizeProfessionCode";
import {
  resolveLaneProfessionalName,
  type ProfessionJoinRow,
} from "./professionBusinessHelpers";
import { profileDisplayName } from "./profileDisplay";
import { professionService } from "../services/professionService";

function laneLookupKey(profileUserId: string, professionCode: string): string {
  return `${profileUserId}:${normalizeProfessionCodeInput(professionCode)}`;
}

/** Public display name for one pro lane — never another lane's global name. */
export async function displayNameForProfessionalLane(
  profileUserId: string,
  professionCode: string
): Promise<string | null> {
  const hits = await batchDisplayNamesForProfessionalLanes([
    { profileUserId, professionCode },
  ]);
  return hits.get(laneLookupKey(profileUserId, professionCode)) ?? null;
}

/**
 * Batch-resolve lane display names for notifications / manage-pro lists.
 * Key: `${profileUserId}:${normalizedProfessionCode}`.
 */
export async function batchDisplayNamesForProfessionalLanes(
  entries: { profileUserId: string; professionCode: string }[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (entries.length === 0) return out;

  const normalized = entries.map((e) => ({
    profileUserId: e.profileUserId,
    code: normalizeProfessionCodeInput(e.professionCode),
  }));

  const userIds = [...new Set(normalized.map((e) => e.profileUserId))];
  const codes = [...new Set(normalized.map((e) => e.code))];

  const [profiles, profProfiles, professionIdsByCode] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.professionalProfile.findMany({
      where: { profileId: { in: userIds } },
      select: { id: true, profileId: true },
    }),
    Promise.all(
      codes.map(async (code) => ({
        code,
        id: await professionService.getProfessionIdByCode(code),
      }))
    ),
  ]);

  const profileByUserId = new Map(profiles.map((p) => [p.id, p]));
  const profProfileIdByUserId = new Map(
    profProfiles.map((p) => [p.profileId, p.id])
  );
  const professionIdByCode = new Map(
    professionIdsByCode.map((p) => [p.code, p.id])
  );

  const profProfileIds = [...profProfileIdByUserId.values()];
  const professionIds = [...professionIdByCode.values()];

  const laneRows =
    profProfileIds.length > 0 && professionIds.length > 0
      ? await prisma.professionalProfession.findMany({
          where: {
            professionalProfileId: { in: profProfileIds },
            professionId: { in: professionIds },
          },
          select: {
            professionalProfileId: true,
            professionId: true,
            firstName: true,
            lastName: true,
            displayName: true,
            businessName: true,
            businessNumber: true,
            businessAddress: true,
            aboutMe: true,
            socialMedia: true,
            bookingSite: true,
            avatarUrl: true,
            discoveryCategories: true,
            profession: { select: { code: true, sortOrder: true } },
          },
        })
      : [];

  const laneByProfAndProfession = new Map<string, ProfessionJoinRow>();
  for (const row of laneRows) {
    laneByProfAndProfession.set(
      `${row.professionalProfileId}:${row.professionId}`,
      row
    );
  }

  for (const { profileUserId, code } of normalized) {
    const clientProfile = profileByUserId.get(profileUserId);
    const profProfileId = profProfileIdByUserId.get(profileUserId);
    const professionId = professionIdByCode.get(code);
    if (!clientProfile || !profProfileId || !professionId) continue;

    const lane = laneByProfAndProfession.get(`${profProfileId}:${professionId}`);
    const resolved = resolveLaneProfessionalName(lane ?? null, clientProfile, null);
    const name =
      resolved.displayName?.trim() || profileDisplayName(clientProfile);
    if (name) {
      out.set(laneLookupKey(profileUserId, code), name);
    }
  }

  return out;
}

export function professionCodeFromNotificationPayload(payload: {
  professionCode?: string | null;
  data?: unknown;
}): string | null {
  if (typeof payload.professionCode === "string" && payload.professionCode.trim()) {
    return payload.professionCode.trim();
  }
  const d = payload.data as Record<string, unknown> | null | undefined;
  const raw = d?.profession_code ?? d?.professionCode;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
