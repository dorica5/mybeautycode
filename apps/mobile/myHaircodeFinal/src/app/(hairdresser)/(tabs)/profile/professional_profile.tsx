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

const ProfessionalProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();
  const { activeProfessionCode } = useActiveProfessionState(profile);

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

  if (!profile?.id) return null;

  const salonName =
    detailForActive?.business_name?.trim() || profile.salon_name;
  const aboutMe = detailForActive?.about_me ?? profile.about_me;
  const salonPhone =
    detailForActive?.business_number?.trim() || profile.salon_phone_number;
  const bookingSite = detailForActive?.booking_site ?? profile.booking_site;
  const socialMediaRaw = detailForActive?.social_media ?? profile.social_media;
  const businessAddress =
    detailForActive?.business_address ?? profile.business_address;

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <PublicProfessionalProfileView
        mode="self"
        profileUserId={profile.id}
        fullName={profile.full_name}
        firstName={profile.first_name ?? null}
        username={profile.username ?? null}
        avatarUrl={avatarImage ?? profile.avatar_url}
        salonName={salonName}
        businessAddress={businessAddress ?? null}
        aboutMe={aboutMe}
        salonPhone={salonPhone}
        bookingSite={bookingSite}
        socialMediaRaw={socialMediaRaw}
        colorBrandRaw={profile.color_brand}
        professionCodes={profile.profession_codes}
        activeProfessionCode={activeProfessionCode}
        onBack={() => router.back()}
      />
    </>
  );
};

export default ProfessionalProfile;
