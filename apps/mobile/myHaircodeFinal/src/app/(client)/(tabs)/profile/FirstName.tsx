import {
  Alert,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  TouchableWithoutFeedback,
  Text,
  Platform,
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
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage("Please enter your first name.");
      return false;
    }
    if (!NAME_RE.test(trimmed)) {
      setErrorMessage(
        "Use only letters, spaces, hyphens, apostrophes, and dots (2–50 characters)."
      );
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

  const getInputStyle = () => {
    if (!attemptedSubmit) return styles.input;
    return [styles.input, error ? styles.errorInput : styles.validInput];
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
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <TopNav
              title="First name"
              showSaveButton={true}
              saveChanged={changed}
              saveAction={save}
              loading={loading}
            />
            <View style={getInputStyle()}>
              <TextInput
                value={firstName}
                placeholder="First name"
                placeholderTextColor={Colors.dark.dark}
                onChangeText={handleChange}
                style={{ fontSize: responsiveFontSize(16, 12) }}
                autoCapitalize="words"
              />
            </View>
            {attemptedSubmit && error && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </View>
    </>
  );
};

export default FirstName;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  input: {
    marginTop: scalePercent(10),
    padding: Platform.OS === "android" ? scale(7) : scale(20),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: 20,
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
