import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavBackRow } from "@/src/components/NavBackRow";
import {
  BrandAddressAutocompleteField,
  type PlaceDetails,
} from "@/src/components/BrandAddressAutocompleteField";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { supabase } from "@/src/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { primaryBlack, primaryWhite, setupSageBackground } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { parsePhoneNumberFromString, getCountryCallingCode } from "libphonenumber-js";
import { parseProfilePhone } from "@/src/lib/profileFieldValidation";
import { usePostHog } from "posthog-react-native";
import {
  PROFESSION_CHOICE_CODES,
  PROFESSION_HEADLINE_ROLE,
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { BYPASS_PRO_PAYWALL_FOR_DEV } from "@/src/lib/subscriptionFlags";
import { setPendingProfessionalSetup } from "@/src/lib/pendingProfessionalSetup";
import { buildProfessionalSetupProfilePutBody } from "@/src/lib/professionalSetupSave";
import { runProfessionalSetupCompletionSideEffects } from "@/src/lib/professionalSetupCompletion";

const ProfessionalSetup = () => {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const formMaxW = useMemo(() => {
    const shortSide = Math.min(winW, winH);
    const pad = responsivePadding(24) * 2;
    if (!isTablet()) return 400;
    return Math.min(contentCardMaxWidth(shortSide), winW - pad);
  }, [winW, winH]);

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
    businessName: "",
    businessPhone: "",
    businessAddress: "",
    socialMedia: "",
    bookingSite: "",
    aboutMe: "",
  });
  /**
   * Canonical place identity from Google Places — captured when the user picks
   * a suggestion; cleared when they edit the address text manually. Sent on
   * save so the backend can upsert a Salon row and link this professional to it.
   */
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [errorMessages, setErrorMessages] = useState({
    businessName: "",
    phone_number: "",
    businessAddress: "",
  });

  useEffect(() => {
    if (!profile) return;
    setFields((prev) => {
      const empty =
        !prev.businessName &&
        !prev.businessPhone &&
        !prev.businessAddress &&
        !prev.socialMedia &&
        !prev.bookingSite &&
        !prev.aboutMe;
      if (!empty) return prev;

      const rows = Array.isArray(
        (profile as { professions_detail?: unknown }).professions_detail
      )
        ? (
            (profile as {
              professions_detail?: Array<{
                profession_code?: string | null;
                business_name?: string | null;
                business_number?: string | null;
                business_address?: string | null;
                social_media?: string | null;
                booking_site?: string | null;
                about_me?: string | null;
              }>;
            }).professions_detail ?? []
          )
        : [];

      const detailForProfession =
        rows.find((row) => {
          const code = coerceProfessionCode(row?.profession_code ?? undefined);
          return code === professionCode;
        }) ?? null;

      /** Per DB, salon/booking/social are scoped to each `professional_professions` row — not shared via Profile. */
      if (!detailForProfession) {
        return prev;
      }

      const bizPhone = detailForProfession.business_number ?? "";
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
        businessName: detailForProfession.business_name ?? "",
        businessPhone: phoneDisplay,
        businessAddress: detailForProfession.business_address ?? "",
        socialMedia: detailForProfession.social_media ?? "",
        bookingSite: detailForProfession.booking_site ?? "",
        aboutMe: detailForProfession.about_me ?? "",
      };
    });
  }, [profile, professionCode]);

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

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "businessName": {
        const trimmed = value.trim();
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            businessName: "Please enter your salon name.",
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
        const r = parseProfilePhone(value, profileCountry);
        setErrorMessages((prev) => ({
          ...prev,
          phone_number: r.ok ? "" : r.message,
        }));
        return r.ok;
      }

      case "businessAddress": {
        const trimmed = value.trim();
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            businessAddress: "Please enter your salon address.",
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

  const setUpDone = async () => {
    setAttemptedSubmit(true);

    if (!validateFields()) {
      return;
    }
    if (!userId) {
      Alert.alert("Setup error", "User not found.");
      return;
    }
    try {
      setLoading(true);

      if (BYPASS_PRO_PAYWALL_FOR_DEV) {
        setLoadingSetup(true);
        const updateBody = buildProfessionalSetupProfilePutBody({
          userId,
          professionCode,
          profileCountry,
          fields,
          placeDetails,
        });
        await updateProfile(updateBody);
        await runProfessionalSetupCompletionSideEffects({
          userId,
          professionCode,
          profile,
          posthog,
        });
        setLoadingSetup(false);
        router.replace("/(professional)/(tabs)/home");
        return;
      }

      const updateBody = buildProfessionalSetupProfilePutBody({
        userId,
        professionCode,
        profileCountry,
        fields,
        placeDetails,
      });

      setPendingProfessionalSetup({
        userId,
        professionCode,
        updateBody,
      });

      router.replace({
        pathname: "/Screens/paywall",
        params: { from: "professional-setup" },
      });
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
      <NavBackRow
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.backRow}
        hitSlop={12}
      />

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

          <View style={[styles.form, { maxWidth: formMaxW }]}>
            <BrandOutlineField
              label="Salon name"
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
                  ? `Salon phone number (${getCountryCode(profileCountry)})`
                  : "Salon phone number"
              }
              value={fields.businessPhone}
              onChangeText={(value) =>
                handleFieldChange("businessPhone", value)
              }
              inputRestriction="telephone"
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
              label="Salon address"
              value={fields.businessAddress}
              onChangeText={(value) =>
                handleFieldChange("businessAddress", value)
              }
              onPlaceSelected={setPlaceDetails}
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
    alignSelf: "flex-start",
    paddingVertical: responsiveMargin(8),
    marginBottom: responsiveMargin(8),
    zIndex: 2,
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
