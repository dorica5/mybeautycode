import React from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { PublicProfessionalProfileView } from "@/src/components/PublicProfessionalProfileView";
import { Colors } from "@/src/constants/Colors";

const ProfessionalProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();

  if (!profile?.id) return null;

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
        salonName={profile.salon_name}
        businessAddress={profile.business_address ?? null}
        aboutMe={profile.about_me}
        salonPhone={profile.salon_phone_number}
        bookingSite={profile.booking_site}
        socialMediaRaw={profile.social_media}
        colorBrandRaw={profile.color_brand}
        professionCodes={profile.profession_codes}
        onBack={() => router.back()}
      />
    </>
  );
};

export default ProfessionalProfile;
