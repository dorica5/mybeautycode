import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
import type { I18nTranslate } from "./moderationLabels";

export function clientAddedPushBody(
  t: I18nTranslate,
  clientFullName: string | null | undefined,
  professionalLane: ProfessionChoiceCode | null | undefined
): string {
  const name = clientFullName?.trim() || t("common.client");
  switch (professionalLane) {
    case "nails":
      return t("push.clientAddedNails", { name });
    case "brows_lashes":
      return t("push.clientAddedBrows", { name });
    case "hair":
      return t("push.clientAddedHair", { name });
    case "esthetician":
      return t("push.clientAddedEsthetician", { name });
    case "barber":
      return t("push.clientAddedBarber", { name });
    default:
      return t("push.clientAddedGeneric", { name });
  }
}
