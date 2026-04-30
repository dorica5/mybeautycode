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
import { Profile } from "@/src/constants/types";
import { validatePersonName } from "@/src/lib/profileFieldValidation";

const FirstName = () => {
  const { profile, setProfile } = useAuth();
  const original = profile.first_name ?? "";
  const id = profile.id;

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
      Alert.alert("User not found");
      return;
    }
    setLoading(true);
    updateProfile(
      { id, first_name: result.value },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            first_name: result.value,
          }));
          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          Alert.alert("Failed to update profile", err.message);
        },
      }
    );
  };

  useEffect(() => {
    setChanged(firstName !== original);
  }, [firstName, original]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title="First name"
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
            accessibilityLabel="First name"
            placeholder="First name"
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
