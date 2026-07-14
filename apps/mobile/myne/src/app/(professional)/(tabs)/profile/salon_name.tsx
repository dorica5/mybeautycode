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
import { validateSalonBusinessName } from "@/src/lib/profileFieldValidation";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useI18n } from "@/src/providers/LanguageProvider";
import { establishmentNoun } from "@/src/constants/professionCodes";

const SalonName = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const placeNoun = establishmentNoun(activeProfessionCode);
  const fieldLabel = t("profile.placeName", { place: placeNoun });
  const originalName =
    profile.business_name ?? profile.salon_name ?? "";
  const id = profile.id;

  const [businessName, setBusinessName] = useState(originalName);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validate = (raw: string) => {
    const result = validateSalonBusinessName(raw);
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    setChanged(true);

    if (attemptedSubmit) {
      setError(!validate(value));
    }
  };

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = () => {
    setAttemptedSubmit(true);

    const nameResult = validateSalonBusinessName(businessName);
    if (!nameResult.ok) {
      setErrorMessage(nameResult.message);
      setError(true);
      return;
    }

    if (!id) {
      Alert.alert(t("profile.userNotFound"));
      return;
    }

    setLoading(true);

    const trimmed = nameResult.value;

    updateProfile(
      {
        id,
        // Prisma: ProfessionalProfile.businessName
        business_name: trimmed,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            business_name: trimmed,
            salon_name: trimmed,
          }));

          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert(t("profile.updateFailed"), error.message);
        },
      }
    );
  };

  useEffect(() => {
    if (!changed) setBusinessName(originalName);
  }, [originalName, changed]);

  useEffect(() => {
    setChanged(businessName !== originalName);
  }, [businessName, originalName]);

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
            placeholder={fieldLabel}
            value={businessName}
            onChangeText={handleBusinessNameChange}
            autoCapitalize="words"
          />
          {attemptedSubmit && error ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default SalonName;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
