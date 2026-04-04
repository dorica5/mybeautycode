import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CaretLeft } from "phosphor-react-native";
import { BrandAddressAutocompleteField } from "@/src/components/BrandAddressAutocompleteField";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { supabase } from "@/src/lib/supabase";
import {
  setLastAppSurface,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";
import { router, useLocalSearchParams } from "expo-router";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { primaryBlack, primaryWhite, setupSageBackground } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  isTablet,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { parsePhoneNumberFromString, getCountryCallingCode } from "libphonenumber-js";
import { usePostHog } from "posthog-react-native";
import {
  PROFESSION_CHOICE_CODES,
  PROFESSION_HEADLINE_ROLE,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";

const ProfessionalSetup = () => {
  const insets = useSafeAreaInsets();
  const { profession_code } = useLocalSearchParams<{
    profession_code?: string;
  }>();
  const professionCode =
    typeof profession_code === "string" &&
    (PROFESSION_CHOICE_CODES as readonly string[]).includes(profession_code)
      ? (profession_code as ProfessionChoiceCode)
      : "hair";

  const headlineRole = PROFESSION_HEADLINE_ROLE[professionCode];
  const { profile, setLoadingSetup } = useAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [fields, setFields] = useState({
    displayName: "",
    businessName: "",
    businessPhone: "",
    businessAddress: "",
    socialMedia: "",
    bookingSite: "",
    aboutMe: "",
  });
  const [errorMessages, setErrorMessages] = useState({
    businessName: "",
    phone_number: "",
    businessAddress: "",
  });

  useEffect(() => {
    if (!profile) return;
    setFields((prev) => {
      const empty =
        !prev.displayName &&
        !prev.businessName &&
        !prev.businessPhone &&
        !prev.businessAddress &&
        !prev.socialMedia &&
        !prev.bookingSite &&
        !prev.aboutMe;
      if (!empty) return prev;
      const bizName =
        profile.business_name ?? (profile as { salon_name?: string }).salon_name ?? "";
      const bizPhone =
        profile.business_number ??
        (profile as { salon_phone_number?: string }).salon_phone_number ??
        "";
      let phoneDisplay = bizPhone;
      if (bizPhone && profile.country) {
        try {
          const parsed = parsePhoneNumberFromString(bizPhone);
          if (parsed) phoneDisplay = parsed.formatNational();
        } catch {
          phoneDisplay = bizPhone;
        }
      }
      return {
        displayName: profile.display_name ?? "",
        businessName: bizName,
        businessPhone: phoneDisplay,
        businessAddress: profile.business_address ?? "",
        socialMedia: profile.social_media ?? "",
        bookingSite: profile.booking_site ?? "",
        aboutMe: profile.about_me ?? "",
      };
    });
  }, [profile]);

  const posthog = usePostHog();
  const profileCountry = profile?.country?.trim() || "";

  const getCountryCode = (countryCode: string) => {
    try {
      return `+${getCountryCallingCode(countryCode as never)}`;
    } catch {
      return "";
    }
  };

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

  const validatePhoneNumber = (phone: string) => {
    if (!profileCountry) return false;
    const trimmed = phone.replace(/^\+\d+\s?/, "").trim();
    if (!trimmed) return false;

    try {
      const parsed = parsePhoneNumberFromString(
        trimmed,
        profileCountry as never
      );
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "businessName": {
        const trimmed = value.trim();
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            businessName: "Please enter your business or studio name.",
          }));
          return false;
        }
        setErrorMessages((prev) => ({ ...prev, businessName: "" }));
        return true;
      }

      case "phone_number": {
        if (!profileCountry) {
          setErrorMessages((prev) => ({
            ...prev,
            phone_number:
              "Your profile has no country. Add it under Profile, then try again.",
          }));
          return false;
        }
        const isValid = validatePhoneNumber(value);
        setErrorMessages((prev) => ({
          ...prev,
          phone_number: isValid
            ? ""
            : "Please enter a valid phone number for your country.",
        }));
        return isValid;
      }

      case "businessAddress": {
        const trimmed = value.trim();
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            businessAddress: "Please enter your business address.",
          }));
          return false;
        }
        setErrorMessages((prev) => ({ ...prev, businessAddress: "" }));
        return true;
      }

      default:
        return true;
    }
  };

  const validateFields = () => {
    const invalid =
      !validateField("businessName", fields.businessName) ||
      !validateField("phone_number", fields.businessPhone) ||
      !validateField("businessAddress", fields.businessAddress);
    return !invalid;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));

    if (attemptedSubmit) {
      if (field === "businessName") validateField("businessName", value);
      if (field === "businessPhone") validateField("phone_number", value);
      if (field === "businessAddress")
        validateField("businessAddress", value);
    }
  };

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const showFieldError = (msg: string) =>
    attemptedSubmit && msg ? (
      <Text style={styles.fieldError}>{msg}</Text>
    ) : null;

  const formatBusinessPhoneE164 = (): string => {
    if (!profileCountry) throw new Error("Missing profile country");
    const raw = fields.businessPhone.trim();
    const clean = raw.replace(/^\+\d+\s?/, "").trim();
    const parsed = parsePhoneNumberFromString(clean, profileCountry as never);
    if (parsed?.isValid()) return parsed.format("E.164");
    return raw;
  };

  const updateUserProfile = async () => {
    if (!userId) throw new Error("User not found");

    const display = fields.displayName.trim();
    const bizAddr = fields.businessAddress.trim();
    const social = fields.socialMedia.trim();
    const booking = fields.bookingSite.trim();

    await updateProfile({
      id: userId,
      business_name: fields.businessName.trim(),
      business_number: formatBusinessPhoneE164(),
      business_address: bizAddr,
      display_name: display.length > 0 ? display : null,
      social_media: social.length > 0 ? social : null,
      booking_site: booking.length > 0 ? booking : null,
      about_me: fields.aboutMe.trim(),
      setup_status: true,
      profession_code: professionCode,
    });
  };

  const setUpDone = async () => {
    setAttemptedSubmit(true);

    if (!validateFields()) {
      return;
    }
    try {
      setLoading(true);
      setLoadingSetup(true);

      await updateUserProfile();
      if (userId) {
        await setLastAppSurface(userId, "professional");
        await setLastProfessionCode(userId, professionCode);
      }
      posthog.capture("Profile Completed", { role: "HAIRDRESSER" });
      if (userId) {
        const { data: user } = await supabase.auth.getUser();
        const display =
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.full_name ||
          "";

        posthog.identify(userId, {
          email: user?.user?.email ?? null,
          role: "HAIRDRESSER",
          name: display,
          country: profile?.country ?? null,
        });
      }

      setLoadingSetup(false);
      router.replace("/(hairdresser)/(tabs)/home");
    } catch (error) {
      console.error("Error during setup:", error);
      setLoadingSetup(false);
      const serverMsg =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Failed to complete setup", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const scrollBottomPad =
    Math.max(insets.bottom, responsiveMargin(16)) + responsiveScale(160);

  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Text style={[Typography.bodyMedium, { color: primaryBlack }]}>
          Loading user data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.backRow}
        hitSlop={12}
      >
        <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
        <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: scrollBottomPad, flexGrow: 1 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[Typography.h3, styles.pageTitle]}
            accessibilityRole="header"
            accessibilityLabel={`${headlineRole} account`}
          >
            {headlineRole}
            {"\n"}
            account
          </Text>

          <Text style={[Typography.h4, styles.aboutYouSubhead]}>About you</Text>

          <View style={styles.form}>
            <BrandOutlineField
              label="Display name (optional)"
              value={fields.displayName}
              onChangeText={(value) => handleFieldChange("displayName", value)}
              autoCapitalize="words"
              containerStyle={styles.formFieldSpacing}
            />

            <BrandOutlineField
              label="Business name"
              value={fields.businessName}
              onChangeText={(value) => handleFieldChange("businessName", value)}
              autoCapitalize="words"
              containerStyle={styles.formFieldSpacing}
            />
            {showFieldError(errorMessages.businessName)}

            {!profileCountry ? (
              <Text style={styles.countryHint}>
                Add your country in Profile to use your local dialing code here.
              </Text>
            ) : null}

            <BrandOutlineField
              label={
                profileCountry
                  ? `Business phone (${getCountryCode(profileCountry)})`
                  : "Business phone"
              }
              value={fields.businessPhone}
              onChangeText={(value) =>
                handleFieldChange("businessPhone", value)
              }
              keyboardType="phone-pad"
              editable={!!profileCountry}
              accessibilityState={{ disabled: !profileCountry }}
              accessibilityHint={
                !profileCountry
                  ? "Add your country in Profile first."
                  : undefined
              }
              containerStyle={
                !profileCountry
                  ? { ...styles.formFieldSpacing, ...styles.phoneFieldDisabled }
                  : styles.formFieldSpacing
              }
            />
            {showFieldError(errorMessages.phone_number)}

            <BrandAddressAutocompleteField
              label="Business address"
              value={fields.businessAddress}
              onChangeText={(value) =>
                handleFieldChange("businessAddress", value)
              }
              countryCode={
                profileCountry.length === 2 ? profileCountry : undefined
              }
              containerStyle={styles.formFieldSpacing}
            />
            {showFieldError(errorMessages.businessAddress)}

            <BrandOutlineField
              label="Social media (optional)"
              value={fields.socialMedia}
              onChangeText={(value) => handleFieldChange("socialMedia", value)}
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.formFieldSpacing}
            />

            <BrandOutlineField
              label="Booking site (optional)"
              value={fields.bookingSite}
              onChangeText={(value) => handleFieldChange("bookingSite", value)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              containerStyle={styles.formFieldSpacing}
            />

            <BrandOutlineField
              label="About me"
              value={fields.aboutMe}
              onChangeText={(value) => handleFieldChange("aboutMe", value)}
              multiline
              minInputHeight={responsiveScale(120, 96)}
              containerStyle={styles.formFieldSpacing}
            />
          </View>

          <View style={styles.btnContainer}>
            <PaddedLabelButton
              title={loading ? "Saving…" : "Save"}
              horizontalPadding={32}
              verticalPadding={16}
              onPress={setUpDone}
              disabled={loading}
              style={styles.saveButton}
              textStyle={styles.saveButtonLabel}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfessionalSetup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: setupSageBackground,
  },
  keyboard: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: responsivePadding(24),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
  },
  backText: {
    color: primaryBlack,
  },
  pageTitle: {
    textAlign: "center",
    color: primaryBlack,
    marginTop: responsiveMargin(isTablet() ? 20 : 32),
    marginBottom: responsiveMargin(14),
  },
  aboutYouSubhead: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: responsiveMargin(isTablet() ? 14 : 18),
    marginBottom: responsiveMargin(isTablet() ? 28 : 36),
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  formFieldSpacing: {
    marginBottom: responsiveMargin(isTablet() ? 26 : 32),
  },
  fieldError: {
    ...Typography.bodySmall,
    color: "#B00020",
    marginTop: -responsiveMargin(12),
    marginBottom: responsiveMargin(8),
  },
  phoneFieldDisabled: {
    opacity: 0.45,
  },
  countryHint: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    marginBottom: responsiveMargin(16),
    textAlign: "center",
  },
  saveButton: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
  },
  saveButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  btnContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(24),
  },
});
