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

const SalonName = () => {
  const { profile, setProfile } = useAuth();
  const originalName = profile.salon_name;
  const id = profile.id;

  const [salon_name, setSalon_Name] = useState(originalName);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);

  const validateSalonName = (name: string) => {
    return /^[a-zA-ZæøåÆØÅ\s'-]{2,50}$/.test(name.trim());
  };

  const handleSalonNameChange = (value: string) => {
    setSalon_Name(value);
    setChanged(true);

    if (attemptedSubmit) {
      setError(!validateSalonName(value));
    }
  };

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = () => {
    setAttemptedSubmit(true);

    if (!validateSalonName(salon_name)) {
      setError(true);
      return;
    }

    if (!id) {
      Alert.alert("User not found");
      return;
    }

    setLoading(true);

    updateProfile(
      {
        id,
        salon_name,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            salon_name,
          }));

          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert("Failed to update profile", error.message);
        },
      }
    );
  };

  useEffect(() => {
    setChanged(salon_name !== originalName);
  }, [salon_name, originalName]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title="Salon name"
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
            accessibilityLabel="Salon name"
            placeholder="Salon name"
            value={salon_name}
            onChangeText={handleSalonNameChange}
            autoCapitalize="words"
          />
          {attemptedSubmit && error ? (
            <Text style={styles.errorText}>
              Please enter a valid name (2–50 letters)
            </Text>
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
