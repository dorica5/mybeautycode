import {
  Alert,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  TouchableWithoutFeedback,
  Platform,
  Text,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import {
  moderateScale,
  responsiveFontSize,
  scale,
  scalePercent,
} from "@/src/utils/responsive";
import { Profile } from "@/src/constants/types";
import { StatusBar } from "expo-status-bar";
import { parseProfilePhone } from "@/src/lib/profileFieldValidation";

const PhoneNumber = () => {
  const { profile, setProfile } = useAuth();
  const originalPhoneNumber = profile.phone_number;
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
      Alert.alert("User not found");
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
        phone_number: formatted,
        country,
      },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            phone_number: formatted,
            country,
          }));

          setChanged(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          const msg = (err?.message ?? "").toLowerCase();
          if (
            msg.includes("phone") &&
            (msg.includes("taken") ||
              msg.includes("already") ||
              msg.includes("use"))
          ) {
            Alert.alert(
              "Phone number in use",
              "This number is already linked to another account."
            );
          } else {
            Alert.alert("Failed to update profile", err.message);
          }
        },
      }
    );
  };

  useEffect(() => {
    setChanged(phoneNumber !== (originalPhoneNumber || ""));
  }, [phoneNumber, originalPhoneNumber]);

  const getInputStyle = () => {
    if (!attemptedSubmit) return styles.input;
    return [styles.input, error ? styles.errorInput : styles.validInput];
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <TopNav
              title="Phone number"
              showSaveButton={true}
              saveChanged={changed}
              saveAction={updateUserProfile}
              loading={loading}
            />
            <View style={getInputStyle()}>
              <TextInput
                value={phoneNumber}
                placeholder={
                  countryHint
                    ? "Phone with country code or national number"
                    : "Phone with country code (e.g. +47…)"
                }
                placeholderTextColor="#687076"
                keyboardType="phone-pad"
                onChangeText={(e) => {
                  setPhoneNumber(e);
                  setChanged(true);
                  if (attemptedSubmit) {
                    const ok = validate(e);
                    setError(!ok);
                  }
                }}
                style={{
                  fontSize: responsiveFontSize(16, 12),
                  color: Colors.dark.dark,
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {attemptedSubmit && error ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </View>
    </>
  );
};

export default PhoneNumber;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  input: {
    marginTop: scalePercent(10),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: 20,
    padding: Platform.OS === "android" ? scale(7) : scale(20),
  },
  errorInput: {
    borderColor: "red",
    borderWidth: scale(1),
  },
  validInput: {
    borderColor: "green",
    borderWidth: scale(1),
  },
  errorText: {
    color: "red",
    fontSize: moderateScale(12),
    marginTop: scale(5),
    marginLeft: scale(10),
  },
});
