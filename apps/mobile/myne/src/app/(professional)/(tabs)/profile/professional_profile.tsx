import React, { useMemo } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { PublicProfessionalProfileView } from "@/src/components/PublicProfessionalProfileView";
import { primaryGreen } from "@/src/constants/Colors";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  resolveProfessionalFullName,
  resolveProfessionalNameParts,
} from "@/src/lib/professionalDisplayName";
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { resolveLaneAboutMe } from "@/src/lib/clientAboutMe";
import {
  resolveLaneBusinessName,
  resolveLaneBusinessPhone,
  resolveLaneBusinessAddress,
  professionDetailForCode,
} from "@/src/lib/professionLaneFields";

const ProfessionalProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();
  const { activeProfessionCode } = useActiveProfessionState(profile);

  const proFullName = useMemo(
    () => resolveProfessionalFullName(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );
  const proFirstName = useMemo(
    () => resolveProfessionalNameParts(profile, activeProfessionCode).firstName,
    [profile, activeProfessionCode]
  );

  const detailForActive = useMemo(
    () => professionDetailForCode(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );

  const laneAvatarPath = useMemo(
    () => resolveAvatarStoragePath(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );

  if (!profile?.id) return null;

  const salonName = resolveLaneBusinessName(profile, activeProfessionCode) || null;
  const aboutMe = resolveLaneAboutMe(detailForActive?.about_me) || null;
  const salonPhone = resolveLaneBusinessPhone(profile, activeProfessionCode);
  const bookingSite = detailForActive?.booking_site?.trim() || profile.booking_site?.trim() || null;
  const socialMediaRaw =
    detailForActive?.social_media?.trim() || profile.social_media?.trim() || null;
  const businessAddress = resolveLaneBusinessAddress(profile, activeProfessionCode) || null;

  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <PublicProfessionalProfileView
        mode="self"
        profileUserId={profile.id}
        fullName={proFullName}
        firstName={proFirstName}
        username={profile.username ?? null}
        avatarUrl={laneAvatarPath ?? avatarImage ?? null}
        salonName={salonName}
        businessAddress={businessAddress ?? null}
        aboutMe={aboutMe}
        salonPhone={salonPhone}
        bookingSite={bookingSite}
        socialMediaRaw={socialMediaRaw}
        colorBrandRaw={activeProfessionCode === "hair" ? profile.color_brand : null}
        professionCodes={profile.profession_codes}
        activeProfessionCode={activeProfessionCode}
        viewerProfessionCodes={profile.profession_codes}
        onBack={() => router.back()}
      />
    </>
  );
};

export default ProfessionalProfile;
