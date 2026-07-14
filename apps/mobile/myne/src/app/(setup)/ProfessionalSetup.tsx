import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
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
  establishmentNoun,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { buildProfessionalSetupProfilePutBody } from "@/src/lib/professionalSetupSave";
import { runProfessionalSetupCompletionSideEffects } from "@/src/lib/professionalSetupCompletion";
import { useI18n } from "@/src/providers/LanguageProvider";
import { ProfessionalDiscoveryCategoriesSection } from "@/src/components/ProfessionalDiscoveryCategoriesSection";
import {
  discoveryOptionsForProfession,
  sanitizeDiscoveryCategoriesForProfession,
} from "@/src/constants/profDiscoveryCategories";

const ProfessionalSetup = () => {
  const { t } = useI18n();
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
  /** "Salon" / "Barbershop" — applied to every business-place label & validation message. */
  const placeNoun = establishmentNoun(professionCode);
  const placeNounLower = establishmentNoun(professionCode, "lower");
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
    discoveryCategories: "",
  });
  const [discoveryCategories, setDiscoveryCategories] = useState<string[]>([]);
  const userEditedRef = useRef(false);

  const requiresDiscoveryCategories =
    discoveryOptionsForProfession(professionCode).length > 0;

  useEffect(() => {
    if (!profile) return;
    setFields((prev) => {
      const empty =
        !prev.businessName &&
        !prev.businessPhone &&
        !prev.businessAddress &&
        !prev.socialMedia &&
        !prev.bookingSite;
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
        Alert.alert(t("common.errorFetchingUser"));
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
            businessName: t("profile.enterPlaceName", { place: placeNounLower }),
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
            phone_number: t("profile.noCountryInProfile"),
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
            businessAddress: t("profile.enterPlaceAddress", {
              place: placeNounLower,
            }),
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
    const businessOk =
      validateField("businessName", fields.businessName) &&
      validateField("phone_number", fields.businessPhone) &&
      validateField("businessAddress", fields.businessAddress);

    let discoveryOk = true;
    if (requiresDiscoveryCategories) {
      const sanitized = sanitizeDiscoveryCategoriesForProfession(
        discoveryCategories,
        professionCode
      );
      if (sanitized.length === 0) {
        setErrorMessages((prev) => ({
          ...prev,
          discoveryCategories: t("discover.expertiseRequired"),
        }));
        discoveryOk = false;
      } else {
        setErrorMessages((prev) => ({ ...prev, discoveryCategories: "" }));
      }
    }

    return businessOk && discoveryOk;
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
      Alert.alert(t("setup.setupError"), t("setup.userNotFound"));
      return;
    }
    try {
      setLoading(true);
      setLoadingSetup(true);
      const updateBody = buildProfessionalSetupProfilePutBody({
        userId,
        professionCode,
        profileCountry,
        fields,
        placeDetails,
        discoveryCategories: requiresDiscoveryCategories
          ? sanitizeDiscoveryCategoriesForProfession(
              discoveryCategories,
              professionCode
            )
          : undefined,
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
    } catch (error) {
      console.error("Error during setup:", error);
      setLoadingSetup(false);
      const serverMsg =
        error instanceof Error ? error.message : t("setup.pleaseTryAgain");
      Alert.alert(t("setup.failedCompleteSetup"), serverMsg);
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
          {t("setup.loadingUserData")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <NavBackRow
        accessibilityLabel={t("common.goBack")}
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
            styles.scrollFill,
            { paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.tapToDismiss}
            onPress={Keyboard.dismiss}
            accessible={false}
          >
          <Text
            style={[Typography.h3, styles.pageTitle]}
            accessibilityRole="header"
            accessibilityLabel={`${headlineRole} ${t("setup.accountSuffix")}`}
          >
            {headlineRole}
            {"\n"}
            {t("setup.accountSuffix")}
          </Text>

          <View style={[styles.form, { maxWidth: formMaxW }]}>
            <BrandOutlineField
              label={t("profile.placeName", { place: placeNoun })}
              value={fields.businessName}
              onChangeText={(value) => handleFieldChange("businessName", value)}
              autoCapitalize="words"
              containerStyle={styles.formFieldSpacing}
            />
            {showFieldError(errorMessages.businessName)}

            {!profileCountry ? (
              <Text style={styles.countryHint}>
                {t("setup.addCountryInProfile")}
              </Text>
            ) : null}

            <BrandOutlineField
              label={
                profileCountry
                  ? t("setup.placePhoneWithCode", {
                      place: placeNoun,
                      code: getCountryCode(profileCountry),
                    })
                  : t("setup.placePhone", { place: placeNoun })
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
                  ? t("setup.addCountryFirst")
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
              label={t("profile.placeAddress", { place: placeNoun })}
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

            {requiresDiscoveryCategories ? (
              <ProfessionalDiscoveryCategoriesSection
                professionCode={professionCode}
                value={discoveryCategories}
                onChange={(next) => {
                  userEditedRef.current = true;
                  setDiscoveryCategories(next);
                  if (attemptedSubmit && next.length > 0) {
                    setErrorMessages((prev) => ({
                      ...prev,
                      discoveryCategories: "",
                    }));
                  }
                }}
                showError={
                  attemptedSubmit &&
                  Boolean(errorMessages.discoveryCategories)
                }
                containerStyle={styles.formFieldSpacing}
              />
            ) : null}

            {/**
             * Social media + booking site + about me are intentionally NOT collected during
             * onboarding (kept short). They are edited later from the pro profile
             * screens (`SocialMedia.tsx` / `BookingSite.tsx` / `AboutMe.tsx`). The save
             * body still sends `social_media: null` / `booking_site: null` / `about_me: null`
             * here, so the row is unchanged for users editing an existing setup.
             */}
          </View>

          <View style={styles.btnContainer}>
            <PaddedLabelButton
              title={loading ? t("common.saving") : t("common.save")}
              horizontalPadding={32}
              verticalPadding={16}
              onPress={setUpDone}
              disabled={loading}
              style={styles.saveButton}
              textStyle={styles.saveButtonLabel}
            />
          </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfessionalSetup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
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
  scrollFill: {
    flexGrow: 1,
  },
  tapToDismiss: {
    flexGrow: 1,
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
