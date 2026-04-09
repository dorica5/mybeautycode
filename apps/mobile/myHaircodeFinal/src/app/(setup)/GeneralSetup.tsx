import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { BrandCountryDropdown } from "@/src/components/BrandCountryDropdown";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useSetup } from "@/src/providers/SetUpProvider";
import { uploadAvatarToStorage } from "@/src/lib/uploadHelpers";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import {
  fetchSignedStorageUrl,
  normalizeStorageObjectPath,
} from "@/src/lib/storageSignedUrl";
import {
  isTablet,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { CaretLeft, Plus } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import {
  parseProfilePhone,
  sanitizeUsername,
  validatePersonName,
  validateUsernameInput,
} from "@/src/lib/profileFieldValidation";

type ApiErrorShape = Error & { status?: number };

function readApiError(e: unknown): { status?: number; message: string } {
  const err = e as ApiErrorShape;
  const status =
    typeof err.status === "number" && !Number.isNaN(err.status)
      ? err.status
      : undefined;
  const message = (err?.message ?? "").trim() || "Something went wrong.";
  return { status, message };
}

function isUsernameConflictCopy(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("username") &&
    (m.includes("taken") || m.includes("already") || m.includes("exists"))
  );
}

function isPhoneConflictCopy(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("phone") &&
    (m.includes("taken") || m.includes("use") || m.includes("already"))
  );
}

type MeProfile = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  country?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
};

export default function GeneralSetup() {
  const insets = useSafeAreaInsets();
  const { profilePicture, setProfilePicture } = useSetup();
  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();
  const localAvatarPickRef = useRef(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    country: "",
    phone: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled || error || !data?.user?.id) return;
      setUserId(data.user.id);
      try {
        const me = await api.get<MeProfile>("/api/auth/me");
        if (cancelled) return;
        if (me.first_name != null) setFirstName(me.first_name);
        if (me.last_name != null) setLastName(me.last_name);
        if (me.username) setUserName(me.username);
        if (me.country) setCountry(me.country);
        if (me.phone_number) {
          const parsed = parsePhoneNumberFromString(me.phone_number);
          if (parsed) setPhone(parsed.formatNational());
          else setPhone(me.phone_number);
        }
        const rawAvatar = me.avatar_url;
        if (!localAvatarPickRef.current && rawAvatar) {
          const objectPath =
            normalizeStorageObjectPath("avatars", rawAvatar) ?? rawAvatar;
          const signed = await fetchSignedStorageUrl("avatars", objectPath);
          if (!cancelled && signed) setProfilePicture(signed);
        }
      } catch {
        const meta = data.user.user_metadata as
          | Record<string, string>
          | undefined;
        if (meta?.username)
          setUserName(sanitizeUsername(String(meta.username)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProfilePicture]);

  const countryDial = () => {
    if (!country) return "";
    try {
      return `+${getCountryCallingCode(country as import("libphonenumber-js").CountryCode)}`;
    } catch {
      return "";
    }
  };

  const runValidation = () => {
    const next = {
      firstName: "",
      lastName: "",
      userName: "",
      country: "",
      phone: "",
    };
    const fnResult = validatePersonName(firstName, "first");
    if (!fnResult.ok) next.firstName = fnResult.message;

    const lnResult = validatePersonName(lastName, "last");
    if (!lnResult.ok) next.lastName = lnResult.message;

    const unResult = validateUsernameInput(userName);
    if (!unResult.ok) next.userName = unResult.message;

    if (!country) next.country = "Select your country.";
    const phoneResult = parseProfilePhone(phone, country || null);
    if (!phoneResult.ok) {
      next.phone = country ? phoneResult.message : "Select country first.";
    }

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith("file://")) {
      try {
        return await uploadAvatarToStorage(profilePicture);
      } catch (e) {
        Alert.alert("Upload failed", String(e));
        return null;
      }
    }
    return normalizeStorageObjectPath("avatars", profilePicture);
  };

  const onSave = async () => {
    setAttempted(true);
    if (!runValidation() || !userId) return;

    setSaving(true);
    try {
      const avatar_url = await uploadAvatar();
      const fnResult = validatePersonName(firstName, "first");
      const lnResult = validatePersonName(lastName, "last");
      const unResult = validateUsernameInput(userName);
      const phoneResult = parseProfilePhone(phone, country);
      if (!fnResult.ok || !lnResult.ok || !unResult.ok || !phoneResult.ok) {
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        id: userId,
        first_name: fnResult.value,
        last_name: lnResult.value,
        username: unResult.value,
        country: country!,
        phone_number: phoneResult.e164,
        setup_status: true,
      };
      if (avatar_url != null) body.avatar_url = avatar_url;
      await updateProfile(body as { id: string; [key: string]: unknown });

      await supabase.auth.updateUser({
        data: {
          username: unResult.value,
          display_name: `${fnResult.value} ${lnResult.value}`.trim(),
        },
      });

      router.replace("/(client)/(tabs)/home");
    } catch (e: unknown) {
      const { status, message } = readApiError(e);

      if (status === 409) {
        const isPhone = isPhoneConflictCopy(message);
        setErrors((prev) => ({
          ...prev,
          userName: isPhone ? prev.userName : message,
          phone: isPhone ? message : prev.phone,
        }));
        return;
      }

      if (status === 400 && message.toLowerCase().includes("username")) {
        setErrors((prev) => ({
          ...prev,
          userName: message,
        }));
        return;
      }

      if (isUsernameConflictCopy(message)) {
        setErrors((prev) => ({ ...prev, userName: message }));
        return;
      }
      if (isPhoneConflictCopy(message)) {
        setErrors((prev) => ({ ...prev, phone: message }));
        return;
      }

      if (status === 403) {
        Alert.alert("Could not save", "You can only update your own profile.");
        return;
      }

      console.error("GeneralSetup save:", e);
      Alert.alert(
        "Could not save",
        message && message !== "Request failed" ? message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      localAvatarPickRef.current = true;
      setProfilePicture(result.assets[0].uri);
    }
  };

  const showFieldError = (msg: string) =>
    attempted && msg ? (
      <Text style={styles.fieldError}>{msg}</Text>
    ) : null;

  const ringSize = responsiveScale(156, 180);

  /** Room below the form so the last fields can scroll above the keyboard without aggressive auto-scroll. */
  const scrollBottomPad =
    Math.max(insets.bottom, responsiveMargin(16)) + responsiveScale(160);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
            styles.scroll,
            { paddingBottom: scrollBottomPad, flexGrow: 1 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces
        >
        <Text style={[Typography.h3, styles.centerHeading]} accessibilityRole="header">
          Create account
        </Text>
        <Text style={[Typography.h4, styles.centerSub, styles.aboutYou]}>
          About you
        </Text>

        <View style={styles.form}>
          <BrandOutlineField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            containerStyle={styles.formFieldSpacing}
          />
          {showFieldError(errors.firstName)}

          <BrandOutlineField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            containerStyle={styles.formFieldSpacing}
          />
          {showFieldError(errors.lastName)}

          <BrandOutlineField
            label="Username"
            value={userName}
            onChangeText={(t) => {
              setUserName(sanitizeUsername(t));
              if (errors.userName) {
                setErrors((prev) => ({ ...prev, userName: "" }));
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.formFieldSpacing}
          />
          {showFieldError(errors.userName)}

          <BrandCountryDropdown
            label="Country"
            value={country}
            onChange={(c) => {
              setCountry(c);
              if (attempted) {
                setErrors((e) => {
                  const phoneOk = c ? parseProfilePhone(phone, c).ok : false;
                  return {
                    ...e,
                    country: c ? "" : "Select your country.",
                    phone: phoneOk ? "" : e.phone,
                  };
                });
              }
            }}
            error={attempted && !!errors.country}
            containerStyle={styles.formFieldSpacing}
          />
          {showFieldError(errors.country)}

          <BrandOutlineField
            label={
              country
                ? `Phone number (${countryDial()})`
                : "Phone number"
            }
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!!country}
            accessibilityState={{ disabled: !country }}
            accessibilityHint={
              !country
                ? "Select your country above to enter your phone number."
                : undefined
            }
            containerStyle={
              !country
                ? { ...styles.formFieldSpacing, ...styles.phoneFieldDisabled }
                : styles.formFieldSpacing
            }
          />
          {showFieldError(errors.phone)}

          <Text
            style={[Typography.h4, styles.profilePicTitle]}
            accessibilityRole="header"
          >
            Profile picture
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add profile image"
            onPress={pickImage}
            style={[
              styles.avatarRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
              },
            ]}
          >
            {profilePicture ? (
              <Image
                source={{ uri: profilePicture }}
                style={{
                  width: ringSize - 8,
                  height: ringSize - 8,
                  borderRadius: (ringSize - 8) / 2,
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Plus size={24} color={primaryBlack} />
                <Text style={[Typography.bodySmall, styles.addImageInside]}>
                  Add image
                </Text>
              </View>
            )}
          </Pressable>

          <PaddedLabelButton
            title={saving ? "Saving…" : "Save"}
            horizontalPadding={32}
            verticalPadding={16}
            disabled={saving}
            onPress={onSave}
            style={styles.save}
            textStyle={styles.saveLabel}
          />
          {saving ? (
            <ActivityIndicator style={styles.spinner} color={primaryBlack} />
          ) : null}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
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
  keyboard: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: responsivePadding(24),
  },
  centerHeading: {
    color: primaryBlack,
    textAlign: "center",
    /** Space under back row before “Create account”. */
    marginTop: responsiveMargin(isTablet() ? 20 : 48),
    marginBottom: responsiveMargin(14),
  },
  centerSub: {
    color: primaryBlack,
    textAlign: "center",
  },
  aboutYou: {
    marginTop: responsiveMargin(isTablet() ? 14 : 18),
    marginBottom: responsiveMargin(isTablet() ? 28 : 36),
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  /** Extra space between form fields (overrides default ~18 in shared components). */
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
  profilePicTitle: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: responsiveMargin(isTablet() ? 20 : 28),
    marginBottom: responsiveMargin(18),
  },
  avatarRing: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: primaryBlack,
    borderStyle: "dashed",
    backgroundColor: primaryWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsiveMargin(32),
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsivePadding(12),
  },
  addImageInside: {
    color: primaryBlack,
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: responsiveMargin(-2),
  },
  save: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
  },
  saveLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  spinner: {
    marginTop: responsiveMargin(12),
  },
});
