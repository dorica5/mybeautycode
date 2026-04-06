import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import TopNav from "@/src/components/TopNav";
import MyTextinput from "@/src/components/MyTextinput";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { supabase } from "@/src/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import MyButton from "@/src/components/MyButton";
import { primaryBlack, setupSageBackground } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveFontSize,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { Spacer } from "@/src/components/Spacer";
import { parsePhoneNumberFromString, getCountryCallingCode } from "libphonenumber-js";
import { usePostHog } from "posthog-react-native";

const INPUT_SURFACE = "#FFFFFF";
const PLACEHOLDER_GRAY = "rgba(33, 36, 39, 0.45)";

const PROFESSION_CODES = ["hair", "brows_lashes", "nails"] as const;

type ProfessionCode = (typeof PROFESSION_CODES)[number];

const PROFESSION_ACCOUNT_TITLE: Record<ProfessionCode, string> = {
  hair: "Hairdresser account",
  brows_lashes: "Brow stylist account",
  nails: "Nail technician account",
};

const HairdresserSetup = () => {
  const { profession_code } = useLocalSearchParams<{
    profession_code?: string;
  }>();
  const professionCode =
    typeof profession_code === "string" &&
    (PROFESSION_CODES as readonly string[]).includes(profession_code)
      ? (profession_code as ProfessionCode)
      : "hair";

  const accountTitle = PROFESSION_ACCOUNT_TITLE[professionCode];
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const aboutMeSectionY = useRef(0);
  const scrollY = useRef(0);
  const { profile, setLoadingSetup } = useAuth();
  const user_type = "HAIRDRESSER";

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errors, setErrors] = useState({
    salonName: false,
    salonPhoneNumber: false,
  });

  const [fields, setFields] = useState({
    salonName: "",
    salonPhoneNumber: "",
    aboutMe: "",
  });
  const [errorMessages, setErrorMessages] = useState({
    salonName: "",
    phone_number: "",
  });

  const posthog = usePostHog();
  const profileCountry = profile?.country?.trim() || "";
  const prefilledProfessionalRef = useRef(false);

  /** Når /api/auth/me returnerer salongdata (etter oppsett eller re-login), vis dem i skjemaet. */
  useEffect(() => {
    if (prefilledProfessionalRef.current || !profile) return;
    const has =
      (profile.salon_name && profile.salon_name.trim()) ||
      (profile.salon_phone_number && profile.salon_phone_number.trim()) ||
      (profile.about_me && profile.about_me.trim());
    if (!has) return;
    prefilledProfessionalRef.current = true;
    setFields({
      salonName: profile.salon_name?.trim() ?? "",
      salonPhoneNumber: profile.salon_phone_number ?? "",
      aboutMe: profile.about_me ?? "",
    });
  }, [profile]);

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
    const trimmed = phone.replace(/^\+\d+\s?/, "").trim();
    if (!trimmed) return false;

    try {
      if (profileCountry) {
        const parsed = parsePhoneNumberFromString(trimmed, profileCountry as never);
        return parsed?.isValid() ?? false;
      }
      const withPlus = phone.trim().startsWith("+") ? phone.trim() : `+${trimmed}`;
      const parsed = parsePhoneNumberFromString(withPlus);
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "salonName": {
        const trimmed = value.trim();
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            salonName: "Please enter your salon name.",
          }));
          return false;
        }
        setErrorMessages((prev) => ({ ...prev, salonName: "" }));
        return true;
      }

      case "phone_number": {
        const isValid = validatePhoneNumber(value);
        setErrorMessages((prev) => ({
          ...prev,
          phone_number: isValid
            ? ""
            : profileCountry
              ? "Please enter a valid phone number for your country."
              : "Enter a valid number including country code (e.g. +47 …).",
        }));
        return isValid;
      }

      default:
        return true;
    }
  };

  const validateFields = () => {
    const newErrors = {
      salonName: !validateField("salonName", fields.salonName),
      salonPhoneNumber: !validateField("phone_number", fields.salonPhoneNumber),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));

    if (attemptedSubmit) {
      if (field === "salonName") {
        setErrors((prev) => ({
          ...prev,
          salonName: !validateField("salonName", value),
        }));
      }
      if (field === "salonPhoneNumber") {
        setErrors((prev) => ({
          ...prev,
          salonPhoneNumber: !validateField("phone_number", value),
        }));
      }
    }
  };

  const getFieldShellStyle = (fieldName: keyof typeof errors) => {
    if (!attemptedSubmit) return styles.fieldShell;
    return [
      styles.fieldShell,
      errors[fieldName] ? styles.fieldShellError : styles.fieldShellValid,
    ];
  };

  const textInputInner = styles.textInputInner;

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const formatSalonPhoneE164 = (): string => {
    const raw = fields.salonPhoneNumber.trim();
    const clean = raw.replace(/^\+\d+\s?/, "").trim();
    if (profileCountry) {
      const parsed = parsePhoneNumberFromString(clean, profileCountry as never);
      if (parsed?.isValid()) return parsed.format("E.164");
    }
    const withPlus = raw.startsWith("+") ? raw : `+${clean}`;
    const parsed = parsePhoneNumberFromString(withPlus);
    if (parsed?.isValid()) return parsed.format("E.164");
    return raw;
  };

  const updateUserProfile = async () => {
    if (!userId) throw new Error("User not found");

    await updateProfile({
      id: userId,
      salon_phone_number: formatSalonPhoneE164(),
      salon_name: fields.salonName.trim(),
      user_type,
      about_me: fields.aboutMe,
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

      router.replace({
        pathname: "./LoadingScreen",
        params: { from: "/(setup)/HairdresserSetup" },
      });
    } catch (error) {
      console.error("Error during setup:", error);
      setLoadingSetup(false);
      Alert.alert("Failed to complete setup", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <ResponsiveText> Loading user data...</ResponsiveText>
      </SafeAreaView>
    );
  }

  const scrollBottomPad =
    scale(24) + Math.max(insets.bottom, scale(12)) + verticalScale(24);

  const revealAboutMeForKeyboard = () => {
    const sectionTop = aboutMeSectionY.current;
    if (sectionTop <= 0) return;

    const marginFromTop = verticalScale(36);
    const targetY = Math.max(0, sectionTop - marginFromTop);
    const alreadyVisible =
      scrollY.current >= targetY - verticalScale(12) &&
      scrollY.current <= targetY + verticalScale(24);

    if (alreadyVisible) return;

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 320);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title={accountTitle} titleStyle={Typography.h3} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? scale(72) : verticalScale(8)
        }
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: scrollBottomPad, flexGrow: 1 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
        >
        <ResponsiveText style={styles.aboutYouSubhead}>About you</ResponsiveText>

        <View style={styles.inputContainer}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            Salon name
          </ResponsiveText>
          <MyTextinput
            placeholder="Enter salon name"
            value={fields.salonName}
            handleChangeText={(value) => handleFieldChange("salonName", value)}
            title=""
            checkmark={attemptedSubmit && !errors.salonName}
            containerStyle={getFieldShellStyle("salonName")}
            style={textInputInner}
            placeholderTextColor={PLACEHOLDER_GRAY}
          />
          {attemptedSubmit && errors.salonName && (
            <ResponsiveText size={12} style={styles.errorText}>
              {errorMessages.salonName}
            </ResponsiveText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            Salon phone number{" "}
            {profileCountry ? (
              <ResponsiveText size={14} style={styles.countryCodeText}>
                ({getCountryCode(profileCountry)})
              </ResponsiveText>
            ) : null}
          </ResponsiveText>
          <MyTextinput
            placeholder={
              profileCountry
                ? "Enter salon phone number"
                : "Include country code, e.g. +47…"
            }
            value={fields.salonPhoneNumber}
            handleChangeText={(value) =>
              handleFieldChange("salonPhoneNumber", value)
            }
            title=""
            keyboardType="phone-pad"
            checkmark={attemptedSubmit && !errors.salonPhoneNumber}
            containerStyle={getFieldShellStyle("salonPhoneNumber")}
            style={textInputInner}
            placeholderTextColor={PLACEHOLDER_GRAY}
          />
          {attemptedSubmit && errors.salonPhoneNumber && (
            <ResponsiveText size={12} style={styles.errorText}>
              {errorMessages.phone_number}
            </ResponsiveText>
          )}
        </View>

        <View
          style={styles.inputContainer}
          onLayout={(e) => {
            aboutMeSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            About me
          </ResponsiveText>
          <TextInput
            placeholder="Let your clients know what's awesome about you and your skills"
            value={fields.aboutMe}
            multiline
            style={styles.textArea}
            onChangeText={(value) => handleFieldChange("aboutMe", value)}
            placeholderTextColor={PLACEHOLDER_GRAY}
            onFocus={revealAboutMeForKeyboard}
          />
        </View>
        <Spacer vertical={10} />

        <View style={styles.btnContainer}>
          <MyButton
            text={loading ? "Almost done..." : "Save"}
            onPress={setUpDone}
            disabled={loading}
            margin={false}
            style={[
              styles.saveButtonBase,
              loading ? styles.saveButtonLoading : styles.saveButtonIdle,
            ]}
            textStyle={styles.saveButtonLabel}
            textSize={16}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HairdresserSetup;

const FIELD_BORDER = "rgba(33, 36, 39, 0.28)";

/** Matches horizontal inset of centered "Save" in a `scale(98)`-wide pill (~Outfit 16). */
const SAVE_BUTTON_WIDTH = 98;
const SAVE_LABEL_ESTIMATE_PT = 36;
const SAVE_BUTTON_INSET = Math.round((SAVE_BUTTON_WIDTH - SAVE_LABEL_ESTIMATE_PT) / 2);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: setupSageBackground,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: scale(20),
  },
  aboutYouSubhead: {
    ...Typography.bodyMedium,
    textAlign: "center",
    marginBottom: scalePercent(4),
    marginTop: scale(4),
    color: primaryBlack,
  },
  label: {
    color: primaryBlack,
    marginTop: scale(8),
    marginBottom: scale(4),
    fontSize: responsiveFontSize(16, 12),
  },
  fieldShell: {
    marginTop: 0,
    marginBottom: responsiveScale(8, 6),
    width: "100%",
    height: responsiveScale(52, 46),
    backgroundColor: INPUT_SURFACE,
    borderRadius: responsiveScale(28, 24),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: FIELD_BORDER,
    overflow: "hidden",
  },
  fieldShellError: {
    borderColor: "#C62828",
    borderWidth: 1,
  },
  fieldShellValid: {
    borderColor: "#2E7D32",
    borderWidth: 1,
  },
  textInputInner: {
    backgroundColor: "transparent",
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
    height: responsiveScale(52, 46),
    borderRadius: 0,
  },
  countryCodeText: {
    color: primaryBlack,
    opacity: 0.72,
  },
  textArea: {
    marginTop: scale(4),
    backgroundColor: INPUT_SURFACE,
    padding: responsiveScale(16, 14),
    borderRadius: responsiveScale(28, 24),
    height: responsiveScale(120, 96),
    textAlignVertical: "top",
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(16, 14),
    lineHeight: responsiveScale(22, 19),
    color: primaryBlack,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: FIELD_BORDER,
  },
  saveButtonBase: {
    backgroundColor: primaryBlack,
    height: scale(52),
    paddingVertical: 0,
    borderRadius: scale(26),
    alignSelf: "center",
    justifyContent: "center",
  },
  saveButtonIdle: {
    width: scale(SAVE_BUTTON_WIDTH),
    paddingHorizontal: 0,
  },
  saveButtonLoading: {
    minWidth: scale(SAVE_BUTTON_WIDTH),
    paddingHorizontal: scale(SAVE_BUTTON_INSET),
  },
  saveButtonLabel: {
    ...Typography.outfitRegular16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  btnContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: responsiveScale(8, 6),
    marginBottom: responsiveScale(24, 18),
  },
  errorText: {
    color: "#C62828",
    marginTop: verticalScale(6),
  },
  inputContainer: {
    marginBottom: responsiveScale(10, 8),
  },
});
