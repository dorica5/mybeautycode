import React from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { PublicClientProfileView } from "@/src/components/PublicClientProfileView";
import { Colors } from "@/src/constants/Colors";

const ClientPublicProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();

  if (!profile?.id) return null;

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <PublicClientProfileView
        mode="self"
        fullName={profile.full_name}
        firstName={profile.first_name ?? null}
        username={profile.username ?? null}
        avatarUrl={profile.avatar_url ?? avatarImage}
        phoneNumber={profile.phone_number}
        aboutMe={profile.about_me}
        onBack={() => router.back()}
      />
    </>
  );
};

export default ClientPublicProfile;
