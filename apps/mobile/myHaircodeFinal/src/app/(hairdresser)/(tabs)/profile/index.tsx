import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCircle,
  Phone,
  HouseLine,
  MapPin,
  PencilSimple,
  LockKey,
  FileText,
  ChatCircleText,
  At,
  PlusCircle,
  MinusCircle,
  CreditCard,
  ArrowCounterClockwise,
} from "phosphor-react-native";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { ProfileMenuNameIcon } from "@/src/components/profileMenuIcons";
import {
  Colors,
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import Profile from "@/src/components/Profile";
import { BrandAccountSurfacePill } from "@/src/components/BrandAccountSurfacePill";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Href, router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import SignOutButton from "@/src/components/SignOutButton";
import { useImageContext } from "@/src/providers/ImageProvider";
import {
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
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
                  router.push("/(hairdresser)/(tabs)/profile/ProfilePicture")
                }
                style={styles.editImagePressable}
              >
                <Text style={styles.editImageText}>Edit image</Text>
              </Pressable>

              <Text style={styles.myProfileTitle}>My profile</Text>

              <BrandAccountSurfacePill
                label="Switch account"
                onPress={() =>
                  router.push({
                    pathname:
                      "/(hairdresser)/(tabs)/profile/SwitchAccount",
                    params: {
                      activeSurface: "professional",
                      returnTo: "pro-profile",
                    },
                  } as Href)
                }
                style={{
                  marginTop: scalePercent(4),
                  marginBottom: responsiveScale(46),
                }}
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterPill]}
              >
                Public profile
              </Text>

              <Profile
                title="First name"
                Icon={ProfileMenuNameIcon}
                tileStyle="light"
                top
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/FirstName")
                }
              />
              <Profile
                title="Last name"
                Icon={ProfileMenuNameIcon}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/LastName")
                }
              />
              <Profile
                title="Username"
                Icon={At}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/Username")
                }
              />
              <Profile
                title="Salon phone number"
                Icon={Phone}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/PhoneNumber")
                }
              />
              <Profile
                title="Salon name"
                Icon={HouseLine}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/salon_name")
                }
              />
              <Profile
                title="Salon address"
                Icon={MapPin}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/salon_address")
                }
              />
              <Profile
                title="About me / Get discovered"
                Icon={PencilSimple}
                tileStyle="light"
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/AboutMe")
                }
              />
              <Profile
                title="Profile picture"
                Icon={UserCircle}
                tileStyle="light"
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/ProfilePicture")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                Privacy settings
              </Text>

              <Profile
                title="Change password"
                Icon={LockKey}
                tileStyle="light"
                top
                onPress={() => router.push("/(auth)/ChangePassword")}
              />
              <Profile
                title="Add account"
                Icon={PlusCircle}
                tileStyle="light"
                onPress={() =>
                  router.push("/(setup)/AddProfession" as Href)
                }
              />
              <Profile
                title="Delete account"
                Icon={MinusCircle}
                tileStyle="light"
                bottom
                lightMarginBottom={46}
                onPress={() => router.push("/(auth)/Delete")}
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                Billing
              </Text>

              <Profile
                title="Subscription"
                Icon={CreditCard}
                tileStyle="light"
                top
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/Billing")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                Terms and privacy
              </Text>

              <Profile
                title="Terms and Privacy"
                Icon={FileText}
                tileStyle="light"
                top
                onPress={() => router.push("/(setup)/TermsAndPrivacy")}
              />
              <Profile
                title="Give us feedback"
                Icon={ChatCircleText}
                tileStyle="light"
                bottom
                onPress={() => {
                  router.push("/Screens/feedback");
                  posthog.capture("Feedback Clicked", {
                    role: "HAIRDRESSER",
                  });
                }}
              />

              <View style={styles.ViewPublicProfileButton}>
                <PaddedLabelButton
                  title="View public profile"
                  horizontalPadding={32}
                  verticalPadding={16}
                  onPress={() =>
                    router.push(
                      "/(hairdresser)/(tabs)/profile/professional_profile"
                    )
                  }
                  style={styles.viewPublicProfileButton}
                  textStyle={styles.viewPublicProfileButtonLabel}
                />
              </View>

              <SignOutButton
                text="Sign out"
                onPress={signOut}
                disabled={loading}
                style={styles.signOutPill}
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
    ...Typography.outfitRegular16,
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
  sectionHeading: {
    ...Typography.label,
    marginTop: scalePercent(5),
    marginHorizontal: scalePercent(5),
    marginBottom: 16,
    color: primaryBlack,
  },
  sectionHeadingAfterPill: {
    marginTop: 0,
  },
  sectionHeadingAfterCard: {
    marginTop: 0,
  },
  ViewPublicProfileButton: {
    marginTop: scalePercent(10),
  },
  signOutPill: {
    borderColor: primaryBlack,
    borderWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: "transparent",
    width: undefined,
    minWidth: responsiveScale(160),
    paddingHorizontal: responsiveScale(24),
  },
});
