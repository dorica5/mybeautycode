import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { Typography } from "@/src/constants/Typography";
import { scale } from "@/src/utils/responsive";
import { parseProfilePhone } from "@/src/lib/profileFieldValidation";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useI18n } from "@/src/providers/LanguageProvider";
import { establishmentNoun } from "@/src/constants/professionCodes";

const PhoneNumber = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const placeNoun = establishmentNoun(activeProfessionCode);
  const fieldLabel = t("profile.placePhoneNumber", { place: placeNoun });
  const originalPhoneNumber =
    profile.business_number ?? profile.salon_phone_number ?? null;
  const userId = profile.id;
  const countryHint = profile.country?.trim() || null;

  const [phoneNumber, setPhoneNumber] = useState(originalPhoneNumber || "");
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const validate = (raw: string) => {
    const result = parseProfilePhone(raw, countryHint);
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const updateUserProfile = () => {
    setAttemptedSubmit(true);
    if (!userId) {
      Alert.alert(t("profile.userNotFound"));
      return;
    }

    if (!validate(phoneNumber)) {
      setError(true);
      return;
    }

    const result = parseProfilePhone(phoneNumber, countryHint);
    if (!result.ok) {
      setError(true);
      return;
    }

    const { e164: formatted, country } = result;

    setLoading(true);

    updateProfile(
      {
        id: userId,
        // Prisma: ProfessionalProfile.businessNumber
        business_number: formatted,
        country,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            business_number: formatted,
            salon_phone_number: formatted,
            country,
          }));

          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (error) => {
          setLoading(false);
          const msg = (error?.message ?? "").toLowerCase();
          if (
            msg.includes("phone") &&
            (msg.includes("taken") ||
              msg.includes("already") ||
              msg.includes("use"))
          ) {
            Alert.alert(
              t("profile.phoneInUse"),
              t("profile.phoneInUseMessage")
            );
          } else {
            Alert.alert(t("profile.updateFailed"), error.message);
          }
        },
      }
    );
  };

  useEffect(() => {
    setChanged(phoneNumber !== (originalPhoneNumber || ""));
  }, [phoneNumber, originalPhoneNumber]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title={fieldLabel}
        showSaveButton
        saveChanged={changed}
        saveAction={updateUserProfile}
        loading={loading}
      />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={mintProfileScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <BrandOutlineField
            accessibilityLabel={fieldLabel}
            placeholder={
              countryHint
                ? t("profile.phonePlaceholderWithCountry")
                : t("profile.phonePlaceholderNoCountry")
            }
            value={phoneNumber}
            onChangeText={(t) => {
              setPhoneNumber(t);
              setChanged(true);
              if (attemptedSubmit) {
                const ok = validate(t);
                setError(!ok);
              }
            }}
            inputRestriction="telephone"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {attemptedSubmit && error ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default PhoneNumber;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
