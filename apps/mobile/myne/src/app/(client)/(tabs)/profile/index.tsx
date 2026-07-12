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
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { BrandAccountSurfacePill } from "@/src/components/BrandAccountSurfacePill";
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
import {
  responsiveScale,
  responsiveMargin,
  scalePercent,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useRefreshProfileOnFocus } from "@/src/hooks/useRefreshProfileOnFocus";
import { AppLanguageButton } from "@/src/components/AppLanguageButton";

const ProfileScreen = () => {
  const { profile, loading, signOut } = useAuth();
  const { avatarImage } = useImageContext();
  const posthog = usePostHog();
  const { t } = useI18n();

  useRefreshProfileOnFocus();

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!profile) {
    return null;
  }

  const profileAvatarSize = scalePercent(25);
  const userTypeRaw =
    profile.user_type ?? (profile as { userType?: string }).userType;
  const hasProfessionalAccount = userTypeRaw === "HAIRDRESSER";

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
              <AvatarWithSpinner
                uri={profile.avatar_url ?? avatarImage}
                size={profileAvatarSize}
                style={styles.profilePic}
              />

              <Pressable
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ProfilePicture")
                }
                style={styles.editImagePressable}
              >
                <Text style={styles.editImageText}>{t("profile.editImage")}</Text>
              </Pressable>

              <Text style={styles.myProfileTitle}>{t("profile.myProfile")}</Text>

              <BrandAccountSurfacePill
                label={
                  hasProfessionalAccount
                    ? t("profile.switchAccount")
                    : t("profile.becomeProfessional")
                }
                onPress={() =>
                  hasProfessionalAccount
                    ? router.push({
                        pathname:
                          "/(professional)/(tabs)/profile/SwitchAccount",
                        params: {
                          activeSurface: "client",
                          returnTo: "client-profile",
                        },
                      } as Href)
                    : router.push("/(setup)/ChooseProfession" as Href)
                }
                style={{
                  marginTop: scalePercent(4),
                  marginBottom: responsiveScale(46),
                }}
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterBecomePro]}
              >
                {t("profile.publicProfile")}
              </Text>

              <Profile
                title={t("profile.firstName")}
                Icon={ProfileMenuNameIcon}
                top
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/FirstName")
                }
              />
              <Profile
                title={t("profile.lastName")}
                Icon={ProfileMenuNameIcon}
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/LastName")
                }
              />
              <Profile
                title={t("profile.username")}
                Icon={At}
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/Username")
                }
              />
              <Profile
                title={t("profile.phoneNumber")}
                Icon={ProfileMenuPhoneIcon}
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/PhoneNumber")
                }
              />
              <Profile
                title={t("profile.aboutMe")}
                Icon={ProfileMenuAboutIcon}
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/AboutMe")
                }
              />
              <Profile
                title={t("profile.profilePicture")}
                Icon={ProfileMenuPictureIcon}
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ProfilePicture")
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.privacySettings")}
              </Text>

              <Profile
                title={t("profile.manageProfessionals")}
                Icon={ProfileMenuManageProfessionalsIcon}
                top
                onPress={() =>
                  router.push("/(client)/(tabs)/profile/ManageProfessionals")
                }
              />
              <Profile
                title={t("profile.changePassword")}
                Icon={ProfileMenuChangePasswordIcon}
                onPress={() => router.push("/(auth)/ChangePassword")}
              />
              <Profile
                title={t("profile.deleteAccount")}
                Icon={ProfileMenuDeleteAccountIcon}
                bottom
                lightMarginBottom={46}
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/Delete",
                    params: { scope: "client" },
                  } as Href)
                }
              />

              <Text
                style={[styles.sectionHeading, styles.sectionHeadingAfterCard]}
              >
                {t("profile.termsAndPrivacy")}
              </Text>
              <Profile
                title={t("profile.termsAndPrivacyLink")}
                Icon={ProfileMenuTermsIcon}
                top
                onPress={() => router.push("/(setup)/TermsAndPrivacy")}
              />
              <Profile
                title={t("profile.giveFeedback")}
                Icon={ProfileMenuFeedbackIcon}
                bottom
                onPress={() => {
                  router.push("/Screens/feedback");
                  posthog.capture("Feedback Clicked", { role: "CLIENT" });
                }}
              />

              <View style={styles.ViewPublicProfileButton}>
                <PaddedLabelButton
                  title={t("profile.viewPublicProfile")}
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
                text={t("profile.signOut")}
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
    width: scalePercent(25),
    aspectRatio: 1,
    alignSelf: "center",
    marginTop: scalePercent(4),
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
    marginBottom: responsiveMargin(16),
    color: primaryBlack,
  },
  sectionHeadingAfterBecomePro: {
    marginTop: 0,
  },
  sectionHeadingAfterCard: {
    marginTop: 0,
  },
  ViewPublicProfileButton: {
    marginTop: scalePercent(10),
  },
});
