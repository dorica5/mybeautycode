import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import TopNav from "@/src/components/TopNav";
import CustomAlert from "@/src/components/CustomAlert";
import { Info } from "phosphor-react-native";
import {
  moderateScale,
  responsiveFontSize,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const AboutMe = () => {
  const { profile, setProfile } = useAuth();
  const originalAboutMe = profile.about_me;
  const originalSocialMedia = profile.social_media;
  const originalBookingSite = profile.booking_site;
  const originalcolorBrand = profile.color_brand;
  const id = profile.id;

  const [about_me, setAboutMe] = useState(originalAboutMe);
  const [social_media, setSocialMedia] = useState(originalSocialMedia);
  const [booking_site, setBookingSite] = useState(originalBookingSite);
  const [color_brand, setColorBrand] = useState(originalcolorBrand);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = () => {
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    setLoading(true);
    updateProfile(
      {
        id,
        about_me,
        social_media,
        booking_site,
        color_brand,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            about_me,
            social_media,
            booking_site,
            color_brand,
          }));
          setChanged(false);
          setLoading(false);
          Keyboard.dismiss();
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert("Failed to update profile", error.message);
        },
      }
    );
  };

  useEffect(() => {
    setChanged(
      about_me !== originalAboutMe ||
        social_media !== originalSocialMedia ||
        booking_site !== originalBookingSite ||
        color_brand !== originalcolorBrand
    );
  }, [
    about_me,
    originalAboutMe,
    social_media,
    originalSocialMedia,
    booking_site,
    originalBookingSite,
    color_brand,
    originalcolorBrand,
  ]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const scrollToInput = (y) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y, animated: true });
    }
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container} edges={["right", "left", "top"]}>
          <TopNav title="About me" />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={
              Platform.OS === "ios" ? scale(100) : scale(20)
            }
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollViewContent}
              bounces={true}
              keyboardDismissMode="interactive"
            >
              <Pressable onPress={dismissKeyboard} style={{ flex: 1 }}>
                <View>
                  <Text style={styles.text}>What's your superpower?</Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.inputDescribe, {fontSize: responsiveFontSize(16, 12)}]}
                    multiline
                    numberOfLines={5}
                    placeholder="Write something"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={(text) => {
                      const lines = text.split("\n");
                      if (lines.length < 5) {
                        setAboutMe(text);
                      } else {
                        const trimmedText = lines.slice(0, 4).join("\n");
                        setAboutMe(trimmedText);
                      }
                    }}
                    value={about_me}
                    textAlignVertical="top"
                    onFocus={() => scrollToInput(0)}
                  />
                </View>

                <View>
                  <Text style={styles.text}>Link to social media</Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.inputColorBrand, {fontSize: responsiveFontSize(16, 12)}]}
                    multiline
                    placeholder="Social media url"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={setSocialMedia}
                    value={social_media}
                    onFocus={() => scrollToInput(200)}
                  />
                </View>

                <View>
                  <Text style={styles.text}>Link to booking site</Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.inputColorBrand, {fontSize: responsiveFontSize(16, 12)}]}
                    multiline
                    placeholder="Booking site url"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={setBookingSite}
                    value={booking_site}
                    onFocus={() => scrollToInput(350)}
                  />
                </View>

                <View style={styles.rowContainer}>
                  <Text style={styles.colorBrandtext}>
                    What color brand does your salon use?
                  </Text>
                  <Pressable onPress={() => setAlertVisible(true)}>
                    <Info size={22} style={styles.infoIcon} />
                  </Pressable>
                </View>

                <CustomAlert
                  visible={alertVisible}
                  title="Color brand"
                  message="Color brand will only be visible to other hairdressers"
                  onClose={() => setAlertVisible(false)}
                />

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.inputColorBrand, {fontSize: responsiveFontSize(16, 12)}]}
                    multiline
                    placeholder="Color brand"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={setColorBrand}
                    value={color_brand}
                    onFocus={() => scrollToInput(500)}
                  />
                </View>

                <Pressable onPress={updateUserProfile} disabled={loading}>
                  <Text
                    style={[
                      styles.save,
                      {
                        color: changed ? "#ED1616" : "#212427",
                        opacity: 0.7,
                        marginTop: verticalScale(20),
                        textAlign: "right",
                      },
                    ]}
                  >
                    {loading ? "Saving" : "Save"}
                  </Text>
                </Pressable>

                <View style={{ height: verticalScale(80) }} />
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
};

export default AboutMe;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(15),
  },
  inputContainer: {
    marginBottom: verticalScale(5),
  },
  text: {
    marginTop: scalePercent(2),
    padding: scalePercent(5),
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-SemiBold",
    borderRadius: 20,
  },
  infoIcon: {
    marginLeft: responsiveScale(10, -500),
    color: Colors.dark.dark,
  },
  textAlert: {
    textAlign: "center",
    marginTop: scalePercent(-3),
    padding: scalePercent(5),
    fontSize: moderateScale(12),
    fontFamily: "Inter-Regular",
  },
  inputDescribe: {
    padding: scalePercent(5),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: 20,
    width: scalePercent(90),
    height: verticalScale(130),
    textAlignVertical: "top",
    color: Colors.dark.dark,
  },
  inputColorBrand: {
    padding: scalePercent(4),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: 20,
    minHeight: verticalScale(50),
    color: Colors.dark.dark,
  },
  save: {
    fontSize: moderateScale(20),
    fontFamily: "Inter-SemiBold",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: scalePercent(2),
    padding: scalePercent(5),
  },
  colorBrandtext: {
    fontSize: moderateScale(15),
    fontFamily: "Inter-SemiBold",
    color: Colors.dark.dark,
  },
});