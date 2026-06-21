import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
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
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { useI18n } from "@/src/providers/LanguageProvider";

const ProfilePicture = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const { avatarImage } = useImageContext();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const originalImage = avatarImage;
  const id = profile.id;
  const [image, setImage] = useState<string | null>(originalImage);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

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
    setLoading(true);

    const avatar_url = await uploadImage();
    if (!avatar_url) {
      setLoading(false);
      return;
    }

    updateProfile(
      {
        id,
        avatar_url,
        profession_code: activeProfessionCode,
      },
      {
        onSuccess: (fresh) => {
          setProfile(fresh as never);
          setLoading(false);
          setChanged(false);
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert(t("profile.updateFailed"), error.message);
        },
      }
    );
  };

  const uploadImage = async () => {
    if (!image?.startsWith("file://")) {
      const path = resolveAvatarStoragePath(profile, activeProfessionCode);
      return path;
    }
    const path = await uploadAvatarToStorage(image);
    if (!path) Alert.alert(t("common.error"), t("profile.uploadImageFailed"));
    return path;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    setImage(originalImage);
  }, [originalImage]);

  useEffect(() => {
    setChanged(image !== originalImage);
  }, [image, originalImage]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title={t("profile.profilePicture")}
        showSaveButton
        saveAction={updateUserProfile}
        loading={loading}
        saveChanged={changed}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[mintProfileScrollContent, styles.scrollInner]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.pickerContainer} onPress={pickImage}>
          {image?.startsWith("file://") || !image ? (
            image ? (
              <Image
                source={{ uri: image }}
                style={styles.pickerCircle}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.pickerCircle} />
            )
          ) : (
            <AvatarWithSpinner
              uri={avatarImage}
              size={scale(150)}
              style={styles.profilePic}
            />
          )}
          {!changed ? (
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
