import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UploadSimple } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import SetUpNav from "@/src/components/SetUpNav";
import MyButton from "@/src/components/MyButton";
import { router } from "expo-router";
import { useSetup } from "@/src/providers/SetUpProvider";
import { Colors } from "@/src/constants/Colors";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { uploadAvatarToStorage } from "@/src/lib/uploadHelpers";
import { useAuth } from "@/src/providers/AuthProvider";
import RemoteImage from "@/src/components/RemoteImage";

const ProfilePicture = () => {
  const {
    phoneNumber: phone_number,
    salonPhoneNumber: salon_phone_number,
    name: full_name,
    profilePicture,
    setProfilePicture,
  } = useSetup();

  const { profile } = useAuth();
  const user_type = "CLIENT";

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        Alert.alert("Error fetching user.");
      } else {
        setUserId(data?.user?.id || null);
      }
    };

    fetchUserId();
  }, []);

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!userId) {
      throw new Error("User not found");
    }

    const avatar_url = await uploadImage();
    await updateProfile({
      id: userId,
      full_name,
      avatar_url,
      phone_number,
      user_type,
    });
  };

  const setUpDone = async () => {
    try {
      router.replace("./LoadingScreen");

      await updateUserProfile();

      setTimeout(() => {
        console.log("In client branch");
        router.replace("../home");
      }, 2000);
    } catch (error) {
      Alert.alert("Failed to complete setup", "Please try again.");

      router.replace("../home");
    }
  };

  const uploadImage = async () => {
    if (!profilePicture?.startsWith("file://")) return profilePicture;
    const path = await uploadAvatarToStorage(profilePicture);
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
      setProfilePicture(result.assets[0].uri);
    }
  };

  const isLocalUri = profilePicture?.startsWith("file://");

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading user data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SetUpNav title="Profile Picture" />

      <Pressable style={styles.pickerContainer} onPress={pickImage}>
        {profilePicture ? (
          isLocalUri ? (
            <Image
              source={{ uri: profilePicture }}
              resizeMode="cover"
              style={styles.pickerCircle}
            />
          ) : (
            <RemoteImage
              path={profilePicture}
              resizeMode="cover"
              style={styles.pickerCircle}
            />
          )
        ) : (
          <View style={styles.pickerCircle}>
            <UploadSimple size={32} color={Colors.dark.dark} />
          </View>
        )}
        <Text style={styles.pickerText}>Upload</Text>
      </Pressable>

      <View style={styles.btnContainer}>
        <MyButton
          text="Finish"
          onPress={setUpDone}
          disabled={!profilePicture}
        />
      </View>
    </SafeAreaView>
  );
};

export default ProfilePicture;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.light,
  },
  pickerContainer: {
    alignItems: "center",
    marginTop: "20%",
  },
  pickerText: {
    fontSize: 22,
    fontFamily: "Inter-SemiBold",
    color: Colors.dark.dark,
    textAlign: "center",
    marginTop: "5%",
  },
  pickerCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.dark.warmGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  btnContainer: {
    width: "25%",
    alignSelf: "center",
    margin: "5%",
  },
});
