import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCircle,
  User,
  Phone,
  HouseLine,
  PencilSimple,
  LockKey,
  UserMinus,
  FileText,
  ChatCircleText,
} from "phosphor-react-native";
import { Colors } from "@/src/constants/Colors";
import Profile from "@/src/components/Profile";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import SignOutButton from "@/src/components/SignOutButton";
import { useImageContext } from "@/src/providers/ImageProvider";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { usePostHog } from "posthog-react-native";

const ProfileScreen = () => {
  const {  loading, signOut } = useAuth();
  const { avatarImage } = useImageContext();
  const posthog = usePostHog();

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.mainView}>
              <Text style={styles.textStyle}>My profile</Text>
              {avatarImage ? (
                <AvatarWithSpinner uri={avatarImage} size={scalePercent(25)} style={styles.profilePic} />
              ) : (
                <View style={styles.profilePic}>
                  <UserCircle size={scalePercent(25) * 0.6} color={Colors.dark.dark} />
                </View>
              )}
              <Text style={styles.subtitle}>PUBLIC PROFILE</Text>
              <Profile
                title="Full name"
                Icon={User}
                top={true}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/FullName")
                }
              />
              <Profile
                title="Salon phone number "
                Icon={Phone}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/PhoneNumber")
                }
              />
              <Profile
                title="Salon name "
                Icon={HouseLine}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/salon_name")
                }
              />
              <Profile
                title="About me"
                Icon={PencilSimple}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/AboutMe")
                }
              />
              <Profile
                title="Profile picture"
                Icon={UserCircle}
                bottom={true}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/ProfilePicture")
                }
              />

              <Text style={[styles.subtitle, { marginTop: scalePercent(15) }]}>
                PRIVACY SETTINGS
              </Text>
              <Profile
                title="Change password"
                Icon={LockKey}
                top={true}
                onPress={() => router.push("/ChangePassword")}
              />
              <Profile
                title="Delete account"
                Icon={UserMinus}
                bottom={true}
                onPress={() => router.push("/Delete")}
              />

              <Text style={[styles.subtitle, { marginTop: scalePercent(15) }]}>
                TERMS AND PRIVACY
              </Text>
              <Profile
                title="Terms and Privacy"
                Icon={FileText}
                top={true}
                bottom={true}
                onPress={() => router.push("/(setup)/TermsAndPrivacy")}
              />
              <Profile
                title="Give us feedback"
                Icon={ChatCircleText}
                top={true}
                bottom={true}
                onPress={() => {
                  router.push("/Screens/feedback")
                  posthog.capture("Feedback Clicked", { role:"HAIRDRESSER" });


                }}
              />

              <View style={styles.ViewPublicProfileButton}>
                <MyButton
                  text="View public profile"
                  textSize={18}
                  textTabletSize={14}
                  onPress={() =>
                    router.push(
                      "/(hairdresser)/(tabs)/profile/hairdresser_profile"
                    )
                  }
                  style={styles.btn}
                />
              </View>

              <SignOutButton
                text="Sign out"
                onPress={signOut}
                disabled={loading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  btn: {
    marginHorizontal: responsiveScale(20),
  },
  mainView: {},
  textStyle: {
    marginTop: scalePercent(10),
    textAlign: "center",
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(24, 20),
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    width: scalePercent(25),
    aspectRatio: 1,
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: scalePercent(5),
  },
  subtitle: {
    margin: scalePercent(5),
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(14, 12),
    color: Colors.dark.dark,
  },
  ViewPublicProfileButton: {
    marginTop: scalePercent(10),
  },
});

export default ProfileScreen;