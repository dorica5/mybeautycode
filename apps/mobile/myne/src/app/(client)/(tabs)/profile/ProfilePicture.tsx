import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
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
import { useI18n } from "@/src/providers/LanguageProvider";

const ProfilePicture = () => {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { avatarImage, refreshAvatarImage } = useImageContext();
  const id = profile.id;
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!id) {
      Alert.alert(t("profile.userNotFound"));
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

      updateProfile(
        { id, avatar_url },
        {
          onSuccess: () => {
            setPickedFileUri(null);
            void refreshAvatarImage();
            setLoading(false);
          },
          onError: (error) => {
            setLoading(false);
            Alert.alert(t("profile.updateFailed"), error.message);
          },
        }
      );
    } catch {
      setLoading(false);
      Alert.alert(t("common.error"), t("profile.uploadImageFailed"));
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
        <Pressable style={styles.pickerContainer} onPress={pickImage}>
          {pickedFileUri ? (
            <Image
              source={{ uri: pickedFileUri }}
              style={styles.pickerCircle}
              resizeMode="cover"
            />
          ) : (
            <AvatarWithSpinner
              uri={profile.avatar_url ?? avatarImage}
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
