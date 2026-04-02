import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { At } from "phosphor-react-native";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import {
  ProfileMenuNameIcon,
  ProfileMenuPhoneIcon,
  ProfileMenuAboutIcon,
  ProfileMenuPictureIcon,
  ProfileMenuManageProfessionalsIcon,
  ProfileMenuChangePasswordIcon,
  ProfileMenuDeleteAccountIcon,
  ProfileMenuTermsIcon,
  ProfileMenuFeedbackIcon,
} from "@/src/components/profileMenuIcons";
import {
  Colors,
  primaryGreen,
  primaryBlack,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import Profile from "@/src/components/Profile";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Href, router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import SignOutButton from "@/src/components/SignOutButton";
import { useImageContext } from "@/src/providers/ImageProvider";
import { responsiveScale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { usePostHog } from "posthog-react-native";

const ProfileScreen = () => {
  const { profile, loading, signOut } = useAuth();
  const { avatarImage } = useImageContext();
  const posthog = usePostHog();

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!profile) {
    return null;
  }

  const profileAvatarSize = scalePercent(25);

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.outer}>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.mainView}>
              {avatarImage ? (
                <AvatarWithSpinner
                  uri={avatarImage}
                  size={profileAvatarSize}
                  style={styles.profilePic}
                />
              ) : (
                <View
                  style={[styles.profilePic, styles.profilePicPlaceholder]}
                >
                  <OrganicPattern
                    width={profileAvatarSize}
                    height={profileAvatarSize}
                  />
                </View>
              )}

              <Pressable
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ProfilePicture")
                }
                style={styles.editImagePressable}
              >
                <Text style={styles.editImageText}>Edit image</Text>
              </Pressable>

              <Text style={styles.myProfileTitle}>My profile</Text>

              <Pressable
                style={styles.becomeProPill}
                onPress={() =>
                  router.push("/(setup)/ChooseProfession" as Href)
                }
              >
                <Text style={styles.becomeProText}>Become a professional</Text>
              </Pressable>

              <Text style={styles.sectionHeading}>Public profile</Text>

              <Profile
                title="First name"
                Icon={ProfileMenuNameIcon}
                top={true}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/FirstName")
                }
              />
              <Profile
                title="Last name"
                Icon={ProfileMenuNameIcon}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/LastName")
                }
              />
              <Profile
                title="Username"
                Icon={At}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/Username")
                }
              />
              <Profile
                title="Phone number"
                Icon={ProfileMenuPhoneIcon}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/PhoneNumber")
                }
              />
              <Profile
                title="About me"
                Icon={ProfileMenuAboutIcon}
                tileStyle="light"
                onPress={() => router.push("/(client)/(tabs)/profile/AboutMe")}
              />
              <Profile
                title="Profile picture"
                Icon={ProfileMenuPictureIcon}
                bottom={true}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ProfilePicture")
                }
              />

              <Text style={[styles.sectionHeading, styles.sectionSpacing]}>
                Privacy settings
              </Text>

              <Profile
                title="Manage professionals"
                Icon={ProfileMenuManageProfessionalsIcon}
                top={true}
                tileStyle="light"
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ManageHairdressers")
                }
              />
              <Profile
                title="Change password"
                Icon={ProfileMenuChangePasswordIcon}
                tileStyle="light"
                onPress={() => router.push("/(auth)/ChangePassword")}
              />
              <Profile
                title="Delete account"
                Icon={ProfileMenuDeleteAccountIcon}
                bottom={true}
                tileStyle="light"
                onPress={() => router.push("/(auth)/Delete")}
              />

              <Text style={[styles.sectionHeading, styles.sectionSpacing]}>
                Terms and privacy
              </Text>
              <Profile
                title="Terms and Privacy"
                Icon={ProfileMenuTermsIcon}
                top={true}
                bottom={true}
                tileStyle="light"
                onPress={() => router.push("/(setup)/TermsAndPrivacy")}
              />
              <Profile
                title="Give us feedback"
                Icon={ProfileMenuFeedbackIcon}
                top={true}
                bottom={true}
                tileStyle="light"
                onPress={() => {
                  router.push("/Screens/feedback");
                  posthog.capture("Feedback Clicked", { role: "CLIENT" });
                }}
              />

              <View style={styles.ViewPublicProfileButton}>
                <PaddedLabelButton
                  title="View public profile"
                  horizontalPadding={32}
                  verticalPadding={16}
                  onPress={() =>
                    router.push("/(client)/(tabs)/profile/client_profile")
                  }
                  style={styles.viewPublicProfileButton}
                  textStyle={styles.viewPublicProfileButtonLabel}
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

export default ProfileScreen;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  container: {
    flex: 1,
  },
  mainView: {
    paddingBottom: scalePercent(8),
  },
  viewPublicProfileButton: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  viewPublicProfileButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    width: scalePercent(25),
    aspectRatio: 1,
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: scalePercent(4),
  },
  profilePicPlaceholder: {
    backgroundColor: primaryWhite,
    overflow: "hidden",
  },
  editImagePressable: {
    alignSelf: "center",
    marginTop: scalePercent(2),
    marginBottom: responsiveScale(10, 8),
  },
  editImageText: {
    ...Typography.bodySmall,
    textDecorationLine: "underline",
    color: primaryBlack,
  },
  myProfileTitle: {
    ...Typography.h3,
    textAlign: "center",
    marginTop: responsiveScale(20, 16),
    color: primaryBlack,
  },
  becomeProPill: {
    alignSelf: "center",
    marginTop: scalePercent(4),
    paddingVertical: responsiveScale(12),
    paddingHorizontal: responsiveScale(20),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  becomeProText: {
    ...Typography.bodyLarge,
    color: primaryBlack,
    textAlign: "center",
  },
  sectionHeading: {
    ...Typography.label,
    marginTop: scalePercent(5),
    marginHorizontal: scalePercent(5),
    marginBottom: scalePercent(1),
    color: primaryBlack,
  },
  sectionSpacing: {
    marginTop: scalePercent(12),
  },
  ViewPublicProfileButton: {
    marginTop: scalePercent(10),
  },
});
