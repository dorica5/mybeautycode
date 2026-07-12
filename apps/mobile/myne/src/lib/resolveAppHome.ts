import type { Profile } from "@/src/constants/types";
import { profileHasProfessionalCapability } from "@/src/constants/professionCodes";
import type { LastAppSurface } from "@/src/lib/lastVisitPreference";

export type AppHomeHref =
  | "/(client)/(tabs)/home"
  | "/(professional)/(tabs)/home";

/** Client vs professional home tab after bootstrap / setup. */
export function resolveAppHome(
  profile: Profile,
  lastAppSurfacePref: LastAppSurface | null | undefined
): AppHomeHref {
  if (!profileHasProfessionalCapability(profile)) {
    return "/(client)/(tabs)/home";
  }
  if (lastAppSurfacePref === "client") {
    return "/(client)/(tabs)/home";
  }
  return "/(professional)/(tabs)/home";
}
