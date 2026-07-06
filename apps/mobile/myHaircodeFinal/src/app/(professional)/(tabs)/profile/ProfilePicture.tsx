import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import React, { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { uploadAvatarToStorage } from "@/src/lib/uploadHelpers";
import TopNav from "@/src/components/TopNav";
import { useImageContext } from "@/src/providers/ImageProvider";
import { responsiveFontSize, scale } from "@/src/utils/responsive";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { Typography } from "@/src/constants/Typography";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  patchProfessionAvatarInProfile,
  resolveAvatarStoragePath,
} from "@/src/lib/resolveAvatarStoragePath";
import { useI18n } from "@/src/providers/LanguageProvider";
import type { Profile } from "@/src/constants/types";

const ProfilePicture = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const { avatarImage, refreshAvatarImage } = useImageContext();
  const { activeProfessionCode, professionLine, storedProfessionReady, commitActiveProfession } =
    useActiveProfessionState(profile);
  const id = profile.id;
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { mutateAsync: updateProfileAsync } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!id) {
      Alert.alert(t("profile.userNotFound"));
      return;
    }
    if (!activeProfessionCode) {
      Alert.alert(
        t("profile.pickProfessionTitle"),
        t("profile.pickProfessionUpdateMessage")
      );
      return;
    }
    if (!pickedFileUri) return;

    setLoading(true);
    try {
      const avatar_url = await uploadAvatarToStorage(pickedFileUri);
      if (!avatar_url) {
        Alert.alert(t("common.error"), t("profile.uploadImageFailed"));
        setLoading(false);
        return;
      }

      const fresh = await updateProfileAsync({
        id,
        avatar_url,
        profession_code: activeProfessionCode,
      });
      const merged = patchProfessionAvatarInProfile(
        fresh as Profile,
        activeProfessionCode,
        avatar_url
      );
      setProfile(merged);
      await commitActiveProfession(activeProfessionCode);
      await refreshAvatarImage({
        professionCode: activeProfessionCode,
        storagePath: avatar_url,
      });
      setPickedFileUri(null);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        t("profile.updateFailed"),
        error instanceof Error ? error.message : t("common.error")
      );
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPickedFileUri(result.assets[0].uri);
    }
  };

  const laneAvatarPath = useMemo(
    () => resolveAvatarStoragePath(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );

  const laneHint =
    storedProfessionReady && activeProfessionCode
      ? professionLine
      : t("common.loading");

  return (
    <MintProfileScreenShell>
      <TopNav
        title={t("profile.profilePicture")}
        showSaveButton
        saveAction={updateUserProfile}
        loading={loading}
        saveChanged={pickedFileUri != null}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[mintProfileScrollContent, styles.scrollInner]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.laneHint}>{laneHint}</Text>
        <Pressable style={styles.pickerContainer} onPress={pickImage}>
          {pickedFileUri ? (
            <Image
              source={{ uri: pickedFileUri }}
              style={styles.pickerCircle}
              resizeMode="cover"
            />
          ) : (
            <AvatarWithSpinner
              uri={laneAvatarPath ?? avatarImage}
              size={scale(150)}
              style={styles.profilePic}
            />
          )}
          {!pickedFileUri ? (
            <Text
              style={[
                Typography.bodyMedium,
                styles.pickerText,
                { fontSize: responsiveFontSize(16, 12) },
              ]}
            >
              Change profile picture
            </Text>
          ) : null}
        </Pressable>
      </ScrollView>
    </MintProfileScreenShell>
  );
};

export default ProfilePicture;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollInner: {
    alignItems: "center",
  },
  laneHint: {
    ...Typography.bodySmall,
    textAlign: "center",
    marginBottom: 12,
    opacity: 0.85,
  },
  pickerContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  pickerText: {
    color: "#C62828",
    textAlign: "center",
    marginTop: 16,
  },
  pickerCircle: {
    width: scale(150),
    height: scale(150),
    borderRadius: scale(75),
    backgroundColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePic: {
    width: scale(150),
    height: scale(150),
    borderRadius: scale(75),
    justifyContent: "center",
    alignItems: "center",
  },
});
