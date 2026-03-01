import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import TopNav from "@/src/components/TopNav";
import { useImageContext } from "@/src/providers/ImageProvider";
import { Profile } from "@/src/constants/types";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  responsiveScale,
  responsiveFontSize,
  scalePercent,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const ProfilePicture = () => {
  const { profile, setProfile } = useAuth();
  const originalImage = profile.avatar_url;
  const id = profile.id;

  const [image, setImage] = useState<string | null>(originalImage);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const { avatarImage } = useImageContext();
  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    setLoading(true);

    const avatar_url = await uploadImage();

    updateProfile(
      { id, avatar_url },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            avatar_url,
          }));
          setLoading(false);
          setChanged(false);
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert("Failed to update profile", error.message);
        },
      }
    );
  };

  const uploadImage = async () => {
    if (!image?.startsWith("file://")) return image;
    const path = await uploadToStorage(image, "avatars");
    if (!path) Alert.alert("Error", "Failed to upload image");
    return path;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    setChanged(image !== originalImage);
  }, [image]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <TopNav
            title="Profile Picture"
            showSaveButton={true}
            saveAction={updateUserProfile}
            loading={loading}
            saveChanged={changed}
          />
          <Pressable style={styles.pickerContainer} onPress={pickImage}>
            {image?.startsWith("file://") || !image ? (
              <Image
                source={{ uri: image }}
                style={styles.pickerCircle}
                resizeMode="cover"
              />
            ) : (
              <AvatarWithSpinner
                uri={avatarImage}
                size={responsiveScale(145, 190)}
                style={styles.profilePic}
              />
            )}
            {!changed && (
              <ResponsiveText
                size={16}
                tabletSize={14}
                weight="SemiBold"
                style={styles.pickerText}
              >
                Change Profile Picture
              </ResponsiveText>
            )}
          </Pressable>
        </SafeAreaView>
      </View>
    </>
  );
};

export default ProfilePicture;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  pickerContainer: {
    alignItems: "center",
    marginTop: responsiveScale(18, 14),
  },
  pickerText: {
    color: "red",
    textAlign: "center",
    marginTop: scalePercent(4),
    fontSize: responsiveFontSize(16, 14),
  },
  pickerCircle: {
    width: responsiveScale(145, 190),
    height: responsiveScale(145, 190),
    borderRadius: responsiveScale(145, 190) / 2,
    backgroundColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePic: {
    borderRadius: responsiveScale(145, 190) / 2,
  },
});
