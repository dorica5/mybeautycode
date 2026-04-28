import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import TopNav from "@/src/components/TopNav";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import CustomAlert from "@/src/components/CustomAlert";
import {
  responsiveFontSize,
  responsiveMargin,
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
import { MintProfileScreenShell } from "@/src/components/MintProfileScreenShell";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";

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
    setAlertVisible(true);
  };

  return (
    <MintProfileScreenShell>
      <TopNav title="Delete account" />
      <View style={styles.body}>
        <Text
          style={[
            Typography.outfitRegular16,
            styles.prompt,
            { fontSize: responsiveFontSize(16, 12) },
          ]}
        >
          Are you sure?
        </Text>
        <PaddedLabelButton
          title="Delete account"
          horizontalPadding={32}
          verticalPadding={16}
          onPress={confirmDelete}
          disabled={loading}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonLabel}
        />
        <CustomAlert
          visible={alertVisible}
          title="Delete account"
          message="Are you sure you want to delete your account? This action cannot be undone."
          onClose={() => setAlertVisible(false)}
          fromDelete={true}
          onDelete={onDelete}
        />
      </View>
    </MintProfileScreenShell>
  );
};

export default Delete;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: scalePercent(5),
    alignItems: "center",
  },
  prompt: {
    textAlign: "center",
    width: scalePercent(85),
    maxWidth: 400,
    marginBottom: scalePercent(5),
    marginTop: scalePercent(12),
    color: primaryBlack,
  },
  primaryButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(8),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  primaryButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});
