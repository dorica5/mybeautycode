import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
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
import {
  coerceProfessionCode,
  profileHasProfessionalCapability,
  PROFESSION_HEADLINE_ROLE,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import {
  setLastAppSurface,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";

/** Client surface = delete Supabase user & DB profile. Professional = delete current lane only (or whole pro profile if last lane). */
type DeleteScope = "client" | "professional";

const Delete = () => {
  const params = useLocalSearchParams<{
    scope?: string;
    profession_code?: string;
  }>();
  const scope: DeleteScope =
    params.scope === "professional" ? "professional" : "client";
  const professionCodeParam =
    typeof params.profession_code === "string"
      ? params.profession_code.trim()
      : "";

  const { profile, clearProfile, setProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  const laneTitle = useMemo(() => {
    const c = coerceProfessionCode(professionCodeParam);
    if (!c) return "this professional profile";
    return PROFESSION_HEADLINE_ROLE[c as ProfessionChoiceCode] ?? "this role";
  }, [professionCodeParam]);

  const alertBody = useMemo(() => {
    if (scope === "professional") {
      return `This removes your ${laneTitle} from Get discovered (including clients linked only to this role and portfolio images for this lane). If it was your only professional role, your professional account is removed — your login stays.`;
    }
    return "Are you sure you want to delete your account? This removes your profile and data from myHaircode and cannot be undone.";
  }, [scope, laneTitle]);

  const onDelete = async () => {
    if (!profile?.id) {
      Alert.alert("Error", "User not found");
      return;
    }
    setAlertVisible(false);
    setLoading(true);
    try {
      if (scope === "professional") {
        if (!professionCodeParam) {
          Alert.alert(
            "Could not delete",
            "Switch account to the professional profile you want to remove, then try again."
          );
          return;
        }
        const qs = new URLSearchParams({
          profession_code: professionCodeParam,
        });
        await api.delete(`/api/users/me/professional-lane?${qs.toString()}`);
        let next = (await api.get("/api/auth/me")) as typeof profile;
        setProfile(next);

        const codes = next.profession_codes ?? [];
        if (codes.length > 0) {
          const first = coerceProfessionCode(codes[0]);
          if (first) await setLastProfessionCode(profile.id, first);
        }

        if (!profileHasProfessionalCapability(next)) {
          await setLastAppSurface(profile.id, "client");
        }
      } else {
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
      }
    } catch (error) {
      Alert.alert(
        "Error",
        (error as Error).message || "An unexpected error occurred"
      );
      console.error("Error deleting:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (scope === "professional" && !professionCodeParam) {
      Alert.alert(
        "Could not delete",
        "Switch account to the professional profile you want to remove, then try again."
      );
      return;
    }
    setAlertVisible(true);
  };

  const promptText =
    scope === "professional"
      ? `Remove ${laneTitle}?`
      : "Delete your account permanently?";

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
          {promptText}
        </Text>
        <PaddedLabelButton
          title={scope === "professional" ? "Remove professional profile" : "Delete account"}
          horizontalPadding={32}
          verticalPadding={16}
          onPress={confirmDelete}
          disabled={loading}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonLabel}
        />
        <CustomAlert
          visible={alertVisible}
          title={scope === "professional" ? "Remove this profile?" : "Delete account"}
          message={alertBody}
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
