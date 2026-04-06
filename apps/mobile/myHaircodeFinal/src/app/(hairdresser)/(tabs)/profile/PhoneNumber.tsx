import {
  Alert,
  Keyboard,
  StyleSheet,
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
import { parsePhoneNumberFromString } from "libphonenumber-js";

const PhoneNumber = () => {
  const { profile, setProfile } = useAuth();
  const originalPhoneNumber = profile.salon_phone_number;
  const userId = profile.id;

  const [phoneNumber, setPhoneNumber] = useState(originalPhoneNumber || "");
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = () => {
    if (!userId) {
      Alert.alert("User not found");
      return;
    }

    const parsed = parsePhoneNumberFromString(phoneNumber.trim());

    if (!parsed || !parsed.isValid()) {
      Alert.alert(
        "Invalid phone number",
        "Please enter a valid phone number with country code (e.g. +47…)."
      );
      return;
    }

    const formatted = parsed.format("E.164");
    const country = parsed.country || "UNKNOWN";

    setLoading(true);

    updateProfile(
      {
        id: userId,
        salon_phone_number: formatted,
        country,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            salon_phone_number: formatted,
            country,
          }));

          setChanged(false);
          setLoading(false);
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
    setChanged(phoneNumber !== originalPhoneNumber);
  }, [phoneNumber, originalPhoneNumber]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title="Salon phone number"
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
            accessibilityLabel="Salon phone number"
            placeholder="e.g. +47…"
            value={phoneNumber}
            onChangeText={(t) => {
              setPhoneNumber(t);
              setChanged(true);
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default PhoneNumber;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
});
