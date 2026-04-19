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

const FullName = () => {
  const { profile, setProfile } = useAuth();
  const originalName = profile.full_name ?? "";
  const id = profile.id;

  const [full_name, setFull_Name] = useState(originalName);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const validateName = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      setErrorMessage("Please enter your full name.");
      return false;
    }

    const nameRegex = /^[a-zA-ZÀ-ÿæøåÆØÅ.\s'’-]{2,50}$/;
    if (!nameRegex.test(trimmed)) {
      setErrorMessage(
        "Remove any numbers or unusual symbols. Only letters, spaces, hyphens (–), apostrophes (‘), and dots (.) are allowed."
      );
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const handleNameChange = (value: string) => {
    setFull_Name(value);
    setChanged(true);

    if (attemptedSubmit) {
      setError(!validateName(value));
    }
  };

  const updateUserProfile = () => {
    setAttemptedSubmit(true);

    if (!validateName(full_name)) {
      setError(true);
      return;
    }

    if (!id) {
      Alert.alert("User not found");
      return;
    }

    const trimmed = full_name.trim();
    setLoading(true);

    updateProfile(
      { id, full_name: trimmed },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            full_name: trimmed,
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
    setChanged(full_name !== originalName);
  }, [full_name, originalName]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title="Full name"
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
            accessibilityLabel="Full name"
            placeholder="Name"
            value={full_name}
            onChangeText={handleNameChange}
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

export default FullName;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
