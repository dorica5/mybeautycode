import { prisma } from "./prisma";
import { professionService } from "../services/professionService";

/**
 * Visit `price` is visible only to professionals viewing in the same profession
 * lane as the visit (`service_records.profession_id`). Clients never see price.
 */
export async function viewerMaySeeServiceRecordPrice(
  viewerProfileId: string,
  visitProfessionId: string,
  professionCodeFromRequest?: string | null
): Promise<boolean> {
  const viewerPP = await prisma.professionalProfile.findUnique({
    where: { profileId: viewerProfileId },
    select: { id: true },
  });
  if (!viewerPP) return false;

  const scope =
    await professionService.resolveActiveProfessionScopeForProfessionalProfile(
      viewerPP.id,
      professionCodeFromRequest
    );
  if (!scope) return false;
  return scope.professionId === visitProfessionId;
}
