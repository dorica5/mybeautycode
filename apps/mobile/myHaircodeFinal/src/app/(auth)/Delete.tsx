import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import CustomAlert from "@/src/components/CustomAlert";
import {  responsiveFontSize, scale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const Delete = () => {
  const { profile, clearProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  const onDelete = async () => {
    if (!profile?.id) {
      Alert.alert("Error", "User not found");
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/api/users/${profile.id}`);
      try {
        await supabase.auth.signOut();
        clearProfile();
      } catch (signOutError) {
        console.warn(
          "Sign out failed (possibly because the user is already deleted):",
          (signOutError as Error).message
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        (error as Error).message || "An unexpected error occurred"
      );
      console.error("Error deleting user:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    console.log("Deleting account...", alertVisible);
    setAlertVisible(true);
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <TopNav title="Delete account" />
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.aboutme, {fontSize: responsiveFontSize(16, 12)}]}>
              Are you sure?
            </Text>
          </View>
          <MyButton
            style={styles.button}
            text="Delete account"
            textSize={18}
            textTabletSize={14}
            onPress={confirmDelete}
            disabled={loading}
          />
          {alertVisible && (
            <CustomAlert
              visible={alertVisible}
              title="Delete account"
              message="Are you sure you want to delete your account? This action cannot be undone."
              onClose={() => setAlertVisible(false)}
              fromDelete={true}
              onDelete={onDelete}
            />
          )}
        </SafeAreaView>
      </View>
    </>
  );
};

export default Delete;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
  },
  input: {
    marginTop: scalePercent(10),
    padding: scalePercent(5),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: 20,
  },
  aboutme: {
    textAlign: "center",
    width: scalePercent(70),
    marginBottom: scalePercent(5),
    marginTop: scalePercent(18),
    fontFamily: "Inter-Regular",
  },
  button: {
    width: scalePercent(90),
    alignSelf: "center",
  },
});