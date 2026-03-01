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
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { StatusBar } from "expo-status-bar";

const PhoneNumber = () => {
  const { profile, setProfile } = useAuth();
  const originalPhoneNumber = profile.phone_number;
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
        "Invalid number",
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
            <View style={styles.input}>
              <TextInput
                value={phoneNumber}
                placeholder="Enter your phone number with country code"
                placeholderTextColor="#687076"
                keyboardType="phone-pad"
                onChangeText={(e) => {
                  setPhoneNumber(e);
                  setChanged(true);
                }}
                style={{
                  fontSize: responsiveFontSize(16, 12),
                  color: Colors.dark.dark,
                }}
              />
            </View>
            {changed && !phoneNumber && (
              <Text style={styles.errorText}>
                Please enter a valid phone number.
              </Text>
            )}
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
  errorText: {
    color: "red",
    fontSize: moderateScale(12),
    marginTop: scale(5),
    marginLeft: scale(10),
  },
});
