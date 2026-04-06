import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import TopNav from "@/src/components/TopNav";
import CustomAlert from "@/src/components/CustomAlert";
import { Info } from "phosphor-react-native";
import { primaryBlack } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { responsiveScale } from "@/src/utils/responsive";

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

  const scrollToInput = (y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  return (
    <MintProfileScreenShell>
      <TopNav
        title="About me /"
        titleLine2="Get discovered"
        showSaveButton
        saveChanged={changed}
        saveAction={updateUserProfile}
        loading={loading}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={mintProfileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <BrandOutlineField
            label="What's your superpower?"
            placeholder="Write something"
            value={about_me}
            onChangeText={(text) => {
              const lines = text.split("\n");
              if (lines.length < 5) {
                setAboutMe(text);
              } else {
                setAboutMe(lines.slice(0, 4).join("\n"));
              }
            }}
            multiline
            minInputHeight={responsiveScale(130)}
            onFocus={() => scrollToInput(0)}
          />

          <BrandOutlineField
            label="Link to social media"
            placeholder="Social media URL"
            value={social_media}
            onChangeText={setSocialMedia}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onFocus={() => scrollToInput(160)}
          />

          <BrandOutlineField
            label="Link to booking site"
            placeholder="Booking site URL"
            value={booking_site}
            onChangeText={setBookingSite}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onFocus={() => scrollToInput(260)}
          />

          <View style={styles.rowContainer}>
            <Text style={[Typography.label, styles.colorBrandLabel]}>
              What color brand does your salon use?
            </Text>
            <Pressable
              onPress={() => setAlertVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="About color brand"
            >
              <Info size={responsiveScale(22)} color={primaryBlack} />
            </Pressable>
          </View>

          <CustomAlert
            visible={alertVisible}
            title="Color brand"
            message="Color brand will only be visible to other hairdressers"
            onClose={() => setAlertVisible(false)}
          />

          <BrandOutlineField
            accessibilityLabel="Color brand"
            placeholder="Color brand"
            value={color_brand}
            onChangeText={setColorBrand}
            onFocus={() => scrollToInput(400)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default AboutMe;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingRight: 4,
  },
  colorBrandLabel: {
    color: primaryBlack,
    flex: 1,
    marginRight: 8,
  },
});
