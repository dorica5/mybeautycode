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

const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;
const USERNAME_MAX_LEN = 30;

function sanitize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, USERNAME_MAX_LEN);
}

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
    const v = sanitize(raw);
    if (!v) {
      setErrorMessage("Enter a username (3–30 characters, letter first).");
      return false;
    }
    if (!USERNAME_RE.test(v)) {
      setErrorMessage(
        "Lowercase letters, digits, underscore only; must start with a letter."
      );
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleChange = (value: string) => {
    setUsername(sanitize(value));
    setChanged(true);
    if (attemptedSubmit) {
      setError(!validate(sanitize(value)));
    }
  };

  const getInputStyle = () => {
    if (!attemptedSubmit) return styles.input;
    return [styles.input, error ? styles.errorInput : styles.validInput];
  };

  const save = () => {
    setAttemptedSubmit(true);
    const v = sanitize(username);
    if (!validate(v)) {
      setError(true);
      return;
    }
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
    setChanged(sanitize(username) !== sanitize(original));
  }, [username, original]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <TopNav
              title="Username"
              showSaveButton={true}
              saveChanged={changed}
              saveAction={save}
              loading={loading}
            />
            <View style={getInputStyle()}>
              <TextInput
                value={username}
                placeholder="username"
                placeholderTextColor={Colors.dark.dark}
                onChangeText={handleChange}
                style={{ fontSize: responsiveFontSize(16, 12) }}
                autoCapitalize="none"
                autoCorrect={false}
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

export default Username;

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
