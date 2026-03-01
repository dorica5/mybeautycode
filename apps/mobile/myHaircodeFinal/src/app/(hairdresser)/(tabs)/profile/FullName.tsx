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
import { StatusBar } from "expo-status-bar";

const FullName = () => {
  const { profile, setProfile } = useAuth();
  const originalName = profile.full_name;
  const id = profile.id;

  const [full_name, setFull_Name] = useState(originalName);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();
  const [errorMessage, setErrorMessage] = useState("");

  const validateName = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      setErrorMessage("Please enter your full name.");
      return false;
    }

    // Allow letters, accents, dots, hyphens, apostrophes, and spaces
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

  const getInputStyle = () => {
    if (!attemptedSubmit) return styles.input;

    return [styles.input, error ? styles.errorInput : styles.validInput];
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

    setLoading(true);

    updateProfile(
      {
        id,
        full_name,
      },
      {
        onSuccess: () => {
          setProfile((prev) => ({
            ...prev,
            full_name,
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
    setChanged(full_name !== originalName);
  }, [full_name, originalName]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <TopNav
              title="Full Name"
              showSaveButton={true}
              saveChanged={changed}
              saveAction={updateUserProfile}
              loading={loading}
            />
            <View style={getInputStyle()}>
              <TextInput
                value={full_name}
                placeholder="Name"
                placeholderTextColor={Colors.dark.dark}
                onChangeText={handleNameChange}
                style={{ fontSize: responsiveFontSize(16, 12) }}
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

export default FullName;

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
