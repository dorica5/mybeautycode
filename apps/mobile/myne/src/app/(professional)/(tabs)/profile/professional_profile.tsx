import React, { useMemo } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { PublicProfessionalProfileView } from "@/src/components/PublicProfessionalProfileView";
import { Colors } from "@/src/constants/Colors";
import type { ProfessionDetailApi } from "@/src/constants/types";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  resolveProfessionalFullName,
  resolveProfessionalNameParts,
} from "@/src/lib/professionalDisplayName";
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { resolveLaneAboutMe } from "@/src/lib/clientAboutMe";
import {
  laneScopedNullableField,
  laneScopedTextField,
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

  const detailForActive = useMemo(() => {
    const rows = profile?.professions_detail;
    const code = activeProfessionCode;
    if (!rows?.length || !code) return null;
    return (
      rows.find(
        (r: ProfessionDetailApi) =>
          coerceProfessionCode(r.profession_code) === code
      ) ?? null
    );
  }, [profile?.professions_detail, activeProfessionCode]);

  const laneAvatarPath = useMemo(
    () => resolveAvatarStoragePath(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );

  if (!profile?.id) return null;

  const salonName =
    laneScopedTextField(
      detailForActive,
      activeProfessionCode,
      detailForActive?.business_name,
      profile.salon_name
    ) || null;
  const aboutMe = resolveLaneAboutMe(detailForActive?.about_me) || null;
  const salonPhone =
    laneScopedTextField(
      detailForActive,
      activeProfessionCode,
      detailForActive?.business_number,
      profile.salon_phone_number
    ) || null;
  const bookingSite = laneScopedNullableField(
    detailForActive,
    activeProfessionCode,
    detailForActive?.booking_site,
    profile.booking_site
  );
  const socialMediaRaw = laneScopedNullableField(
    detailForActive,
    activeProfessionCode,
    detailForActive?.social_media,
    profile.social_media
  );
  const businessAddress =
    laneScopedNullableField(
      detailForActive,
      activeProfessionCode,
      detailForActive?.business_address,
      profile.business_address
    );

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
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
