import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import RemoteImage from "@/src/components/RemoteImage";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { uploadAvatarToStorage } from "@/src/lib/uploadHelpers";
import TopNav from "@/src/components/TopNav";
import { useImageContext } from "@/src/providers/ImageProvider";
import { moderateScale, responsiveFontSize, scale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const ProfilePicture = () => {
  const { profile, setProfile } = useAuth();
  const { avatarImage } = useImageContext();
  const originalImage = avatarImage;
  const id = profile.id;
  const [image, setImage] = useState<string | null>(originalImage);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    setLoading(true);

    const avatar_url = await uploadImage();

    updateProfile(
      {
        id,
        avatar_url,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
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
    const path = await uploadAvatarToStorage(image);
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
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
              <AvatarWithSpinner uri={avatarImage} size={scale(150)} style={styles.profilePic} />
            )}
            {changed ? (
              ""
            ) : (
              <Text style={[styles.pickerText, {fontSize: responsiveFontSize(16, 12)}]}>
                Change Profile Picture
              </Text>
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
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  save: {
    fontSize: moderateScale(20),
    fontFamily: "Inter-SemiBold",
  },
  pickerContainer: {
    alignItems: "center",
    marginTop: scalePercent(18),
  },
  pickerText: {
    fontFamily: "Inter-SemiBold",
    color: "red",
    textAlign: "center",
    marginTop: scalePercent(5),
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
    marginTop: "0%",
    width: scale(150),
    height: scale(150),
    borderRadius: scale(75),
    justifyContent: "center",
    alignItems: "center",
  },
});