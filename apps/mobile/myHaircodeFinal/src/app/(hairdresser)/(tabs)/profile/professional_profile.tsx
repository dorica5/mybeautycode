import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Pressable,
  ScrollView,
} from "react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import RemoteImage from "@/src/components/RemoteImage";
import OpenUrl from "@/src/components/OpenUrl";
import { Colors } from "@/src/constants/Colors";
import { useImageContext } from "@/src/providers/ImageProvider";
import ProfileRectangle from "@/src/components/profileRectangles";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { 
  responsiveScale,
  scalePercent, 
  responsiveFontSize,
  responsiveBorderRadius,
  verticalScale
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import {
  profileHasHairProfession,
  profileHasProfessionalCapability,
} from "@/src/constants/professionCodes";
import { colorBrandsLabel } from "@/src/lib/colorBrandStorage";
import { primarySocialUrl } from "@/src/lib/socialMediaStorage";

const ProfessionalProfile = () => {
  const { profile } = useAuth();
  const bookingSiteUri = profile.booking_site;
  const socialMediaUri = primarySocialUrl(profile.social_media);
  const salonPhoneNumber = profile.salon_phone_number;
  const colorBrandsText = colorBrandsLabel(profile.color_brand);
  const { avatarImage } = useImageContext();

  console.log("avatarImage: ", avatarImage);
  const handlePhoneCall = async () => {
    const phoneUrl = `tel:${salonPhoneNumber}`;

    const supported = await Linking.canOpenURL(phoneUrl);
    if (supported) {
      Linking.openURL(phoneUrl);
    }
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.container}>
            <Pressable onPress={() => router.back()} style={styles.iconContainer}>
              <CaretLeft size={responsiveScale(32)} color={Colors.dark.dark} />
            </Pressable>

            <ProfileRectangle full_name={profile.full_name} />
            <View>
              <AvatarWithSpinner
                uri={profile ? avatarImage : undefined}
                size={scalePercent(25)}
                style={styles.profilePic}
              />
            </View>

            <View style={styles.stack}>
              {profile.about_me && (
                <View style={styles.aboutContainer}>
                  <Text style={[styles.bio, {fontSize: responsiveFontSize(16, 12)}]}>{profile.about_me}</Text>
                </View>
              )}

              <Text style={[styles.nameAndNumber, {fontSize: responsiveFontSize(25, 20)}]}>{profile.salon_name}</Text>

              <View style={[styles.phoneContainer, { marginBottom: "10%" }]}>
                <Text style={[styles.label, {fontSize: responsiveFontSize(20, 16)}]}>Salon phone number: </Text>
                <TouchableOpacity onPress={handlePhoneCall}>
                  <Text style={[styles.phoneNumber, {fontSize: responsiveFontSize(20, 16)}]}>{salonPhoneNumber}</Text>
                </TouchableOpacity>
              </View>
              {profileHasProfessionalCapability(profile) &&
              profileHasHairProfession(profile) &&
              colorBrandsText.length > 0 ? (
                <Text
                  style={[
                    styles.colorBrand,
                    { fontSize: responsiveFontSize(16, 12) },
                  ]}
                >
                  {" "}
                  Color brand: {colorBrandsText}{" "}
                </Text>
              ) : null}

              {bookingSiteUri ? (
                <OpenUrl url={bookingSiteUri}>Open Booking Site</OpenUrl>
              ) : null}
              {socialMediaUri ? (
                <OpenUrl url={socialMediaUri}>Open Social Media Account</OpenUrl>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default ProfessionalProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: responsiveScale(100),
  },
  scrollViewContent: {
    paddingBottom: responsiveScale(100),
    paddingTop: 0,
  },
  iconContainer: {
    position: "absolute",
    top: responsiveScale(60),
    left: responsiveScale(20),
    zIndex: 10,
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
  },
  profilePicPlaceholder: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
  },

  stack: {
    marginTop: responsiveScale(200, 300),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
  },
  name: {
    textAlign: "center",
    fontFamily: "Regular",
    marginTop: scalePercent(5),
  },
  nameAndNumber: {
    textAlign: "center",
    fontFamily: "Inter-Regular",
    marginTop: scalePercent(10),
  },
  phoneContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: scalePercent(5),
  },
  label: {
    fontFamily: "Inter-Regular",
  },
  colorBrand: {
    fontFamily: "Inter-Regular",
    marginTop: scalePercent(-4),
  },
  phoneNumber: {
    color: Colors.light.warmGreen,
    textDecorationLine: "underline",
    fontFamily: "Inter-SemiBold",
  },
  bio: {
    textAlign: "left",
    fontFamily: "Inter-Regular",
    marginTop: "0%",
  },
  aboutContainer: {
    backgroundColor: Colors.dark.light,
    borderRadius: responsiveBorderRadius(20),
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    marginTop: scalePercent(20),
    width: scalePercent(90),
    padding: scalePercent(5),
  },
});