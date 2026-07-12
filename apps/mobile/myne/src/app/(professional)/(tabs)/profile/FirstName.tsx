import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
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
import { validatePersonName } from "@/src/lib/profileFieldValidation";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { resolveProfessionalNameParts } from "@/src/lib/professionalDisplayName";
import { useI18n } from "@/src/providers/LanguageProvider";

const FirstName = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const id = profile.id;
  const nameParts = useMemo(
    () => resolveProfessionalNameParts(profile, activeProfessionCode),
    [profile, activeProfessionCode]
  );
  const original = nameParts.firstName;

  const [firstName, setFirstName] = useState(original);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const validate = (name: string) => {
    const result = validatePersonName(name, "first");
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleChange = (value: string) => {
    setFirstName(value);
    setChanged(true);
    if (attemptedSubmit) {
      setError(!validate(value));
    }
  };

  const save = () => {
    setAttemptedSubmit(true);
    const result = validatePersonName(firstName, "first");
    if (!result.ok) {
      setErrorMessage(result.message);
      setError(true);
      return;
    }
    if (!id) {
      Alert.alert(t("profile.userNotFound"));
      return;
    }
    setLoading(true);
    updateProfile(
      {
        id,
        pro_first_name: result.value,
        ...(activeProfessionCode
          ? { profession_code: activeProfessionCode }
          : {}),
      },
      {
        onSuccess: (fresh) => {
          setProfile(fresh);
          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          Alert.alert(t("profile.updateFailed"), err.message);
        },
      }
    );
  };

  useEffect(() => {
    setFirstName(original);
  }, [original]);

  useEffect(() => {
    setChanged(firstName !== original);
  }, [firstName, original]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title={t("profile.firstName")}
        showSaveButton
        saveChanged={changed}
        saveAction={save}
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
            accessibilityLabel={t("profile.firstName")}
            placeholder={t("profile.firstName")}
            value={firstName}
            onChangeText={handleChange}
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

export default FirstName;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
