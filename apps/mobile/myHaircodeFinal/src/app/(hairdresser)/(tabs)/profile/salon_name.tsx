import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  TouchableWithoutFeedback,
  Alert,
  Text,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { moderateScale, responsiveFontSize, scale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

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

  const getInputStyle = () => {
    if (!attemptedSubmit) return styles.input;

    return [styles.input, error ? styles.errorInput : styles.validInput];
  };

  useEffect(() => {
    setChanged(salon_name !== originalName);
  }, [salon_name, originalName]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <TopNav
              title="Salon Name"
              showSaveButton={true}
              saveChanged={changed}
              saveAction={updateUserProfile}
              loading={loading}
            />
            <View style={getInputStyle()}>
              <TextInput
                value={salon_name}
                placeholder="Name"
                placeholderTextColor={Colors.dark.dark}
                onChangeText={handleSalonNameChange}
                style={{fontSize: responsiveFontSize(16, 12)}}
              />
            </View>
            {attemptedSubmit && error && (
              <Text style={styles.errorText}>
                Please enter a valid name (2-50 letters)
              </Text>
            )}
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </View>
    </>
  );
};

export default SalonName;

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