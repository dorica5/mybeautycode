import React from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { PublicClientProfileView } from "@/src/components/PublicClientProfileView";
import { primaryGreen } from "@/src/constants/Colors";
import { resolveClientAboutMe } from "@/src/lib/clientAboutMe";

const ClientPublicProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();

  if (!profile?.id) return null;

  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <PublicClientProfileView
        mode="self"
        fullName={profile.full_name}
        firstName={profile.first_name ?? null}
        username={profile.username ?? null}
        avatarUrl={profile.avatar_url ?? avatarImage}
        phoneNumber={profile.phone_number}
        aboutMe={resolveClientAboutMe(profile)}
        onBack={() => router.back()}
      />
    </>
  );
};

export default ClientPublicProfile;
