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
import {
  sanitizeUsername,
  validateUsernameInput,
} from "@/src/lib/profileFieldValidation";

const Username = () => {
  const { profile, setProfile } = useAuth();
  const original = profile.username ?? "";
  const id = profile.id;

  const [username, setUsername] = useState(original);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const validate = (raw: string) => {
    const result = validateUsernameInput(raw);
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleChange = (value: string) => {
    setUsername(sanitizeUsername(value));
    setChanged(true);
    if (attemptedSubmit) {
      setError(!validate(sanitizeUsername(value)));
    }
  };

  const save = () => {
    setAttemptedSubmit(true);
    const result = validateUsernameInput(username);
    if (!result.ok) {
      setErrorMessage(result.message);
      setError(true);
      return;
    }
    const v = result.value;
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    setLoading(true);
    updateProfile(
      { id, username: v },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            username: v,
          }));
          setUsername(v);
          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          const msg = (err?.message ?? "").toLowerCase();
          if (msg.includes("username") && msg.includes("taken")) {
            Alert.alert("Username taken", "Try another username.");
          } else {
            Alert.alert("Failed to update profile", err.message);
          }
        },
      }
    );
  };

  useEffect(() => {
    setChanged(sanitizeUsername(username) !== sanitizeUsername(original));
  }, [username, original]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title="Username"
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
            accessibilityLabel="Username"
            placeholder="username"
            value={username}
            onChangeText={handleChange}
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

export default Username;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
