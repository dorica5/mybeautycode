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
  ChartLineUp,
} from "phosphor-react-native";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { ProfileMenuNameIcon } from "@/src/components/profileMenuIcons";
import {
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
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { useEstablishmentNoun, useI18n } from "@/src/providers/LanguageProvider";
import { AppLanguageButton } from "@/src/components/AppLanguageButton";

const ProfileScreen = () => {
  const { profile, loading, signOut } = useAuth();
  const { avatarImage } = useImageContext();
  const posthog = usePostHog();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const { t } = useI18n();
  const placeNoun = useEstablishmentNoun(activeProfessionCode);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!profile) {
    return null;
  }

  const laneAvatarPath = resolveAvatarStoragePath(profile, activeProfessionCode);
  const avatarUri = laneAvatarPath ?? avatarImage;
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
              <AppLanguageButton />
              {avatarUri ? (
                <AvatarWithSpinner
                  uri={avatarUri}
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
                  router.push("/(professional)/(tabs)/profile/ProfilePicture")
                }
                style={styles.editImagePressable}
              >
                <Text style={styles.editImageText}>{t("profile.editImage")}</Text>
              </Pressable>

              <Text style={styles.myProfileTitle}>{t("profile.myProfile")}</Text>

              <BrandAccountSurfacePill
                label={t("profile.switchAccount")}
                onPress={() =>
                  router.push({
                    pathname:
                      "/(professional)/(tabs)/profile/SwitchAccount",
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
                {t("profile.publicProfile")}
              </Text>

              <Profile
                title={t("profile.firstName")}
                Icon={ProfileMenuNameIcon}
                top
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/FirstName")
                }
              />
              <Profile
                title={t("profile.lastName")}
                Icon={ProfileMenuNameIcon}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/LastName")
                }
              />
              <Profile
                title={t("profile.username")}
                Icon={At}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/Username")
                }
              />
              <Profile
                title={t("profile.placePhoneNumber", { place: placeNoun })}
                Icon={Phone}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/PhoneNumber")
                }
              />
              <Profile
                title={t("profile.placeName", { place: placeNoun })}
                Icon={HouseLine}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/salon_name")
                }
              />
              <Profile
                title={t("profile.placeAddress", { place: placeNoun })}
                Icon={MapPin}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/salon_address")
                }
              />
              <Profile
                title={t("profile.aboutMeGetDiscovered")}
                Icon={PencilSimple}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/AboutMe")
                }
              />
              <Profile
                title={t("profile.profilePicture")}
                Icon={UserCircle}
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/ProfilePicture")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.reachAndStats")}
              </Text>

              <Profile
                title={t("profile.yourReachAndStats")}
                Icon={ChartLineUp}
                top
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/professional_insights")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.privacySettings")}
              </Text>

              <Profile
                title={t("profile.changePassword")}
                Icon={LockKey}
                top
                onPress={() => router.push("/(auth)/ChangePassword")}
              />
              <Profile
                title={t("profile.addAccount")}
                Icon={PlusCircle}
                onPress={() =>
                  router.push("/(setup)/AddProfession" as Href)
                }
              />
              <Profile
                title={t("profile.deleteAccount")}
                Icon={MinusCircle}
                bottom
                lightMarginBottom={46}
                onPress={() => {
                  const code =
                    activeProfessionCode === "brows"
                      ? "brows_lashes"
                      : activeProfessionCode ?? "";
                  router.push({
                    pathname: "/(auth)/Delete",
                    params: {
                      scope: "professional",
                      profession_code: code,
                    },
                  } as Href);
                }}
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.billing")}
              </Text>

              <Profile
                title={t("profile.subscription")}
                Icon={CreditCard}
                top
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(professional)/(tabs)/profile/Billing")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.termsAndPrivacy")}
              </Text>

              <Profile
                title={t("profile.termsAndPrivacyLink")}
                Icon={FileText}
                top
                onPress={() => router.push("/(setup)/TermsAndPrivacy")}
              />
              <Profile
                title={t("profile.giveFeedback")}
                Icon={ChatCircleText}
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
                  title={t("profile.viewPublicProfile")}
                  horizontalPadding={32}
                  verticalPadding={16}
                  onPress={() =>
                    router.push(
                      "/(professional)/(tabs)/profile/professional_profile"
                    )
                  }
                  style={styles.viewPublicProfileButton}
                  textStyle={styles.viewPublicProfileButtonLabel}
                />
              </View>

              <SignOutButton
                text={t("profile.signOut")}
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
    position: "relative",
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
    backgroundColor: primaryWhite,
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
