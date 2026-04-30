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
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  coerceProfessionCode,
  profileHasProfessionalCapability,
  PROFESSION_ACCOUNT_LABEL,
  PROFESSION_HEADLINE_ROLE,
} from "@/src/constants/professionCodes";
import {
  setLastAppSurface,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";

/** Client surface = delete Supabase user & DB profile. Professional = delete current lane only (or whole pro profile if last lane). */
type DeleteScope = "client" | "professional";

function routeProfessionParam(
  params: Record<string, unknown> | undefined
): string {
  const p = params ?? {};
  const candidates = [p.profession_code, p.professionCode];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
      return v[0].trim();
    }
  }
  return "";
}

const Delete = () => {
  const params = useLocalSearchParams<{
    scope?: string;
    profession_code?: string;
    professionCode?: string;
  }>();
  const scope: DeleteScope =
    params.scope === "professional" ? "professional" : "client";
  const professionCodeParam = routeProfessionParam(
    params as Record<string, unknown> | undefined
  );

  const { profile, clearProfile, setProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  const coercedLaneCode = useMemo(
    () => coerceProfessionCode(professionCodeParam),
    [professionCodeParam]
  );

  const laneTitle = useMemo(() => {
    if (!coercedLaneCode || !PROFESSION_HEADLINE_ROLE) {
      return "this professional profile";
    }
    return PROFESSION_HEADLINE_ROLE[coercedLaneCode] ?? "this role";
  }, [coercedLaneCode]);

  const laneAccountLabel = useMemo(() => {
    if (!coercedLaneCode || !PROFESSION_ACCOUNT_LABEL) return null;
    return PROFESSION_ACCOUNT_LABEL[coercedLaneCode] ?? null;
  }, [coercedLaneCode]);

  const alertBody = useMemo(() => {
    if (scope === "professional") {
      const youRemove =
        laneAccountLabel ?? laneTitle;
      return `This removes your ${youRemove} from Get discovered (including clients linked only to this role and portfolio images for this lane). If it was your only professional role, your professional account is removed — your login stays.`;
    }
    return `Are you sure you want to delete your account? This removes your profile and data from ${BRAND_DISPLAY_NAME} and cannot be undone.`;
  }, [scope, laneAccountLabel, laneTitle]);

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
        const canonical =
          coerceProfessionCode(professionCodeParam) ?? professionCodeParam;
        await api.post(`/api/users/me/professional-lane/delete`, {
          profession_code: canonical,
        });
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
      ? coercedLaneCode &&
          PROFESSION_HEADLINE_ROLE &&
          PROFESSION_HEADLINE_ROLE[coercedLaneCode]
        ? `Remove ${PROFESSION_HEADLINE_ROLE[coercedLaneCode].toLowerCase()} account?`
        : `Remove ${laneTitle}?`
      : "Delete your account permanently?";

  const removeProfileButtonTitle =
    scope === "professional" &&
    coercedLaneCode &&
    PROFESSION_HEADLINE_ROLE &&
    PROFESSION_HEADLINE_ROLE[coercedLaneCode]
      ? `Remove ${PROFESSION_HEADLINE_ROLE[coercedLaneCode].toLowerCase()} profile`
      : scope === "professional"
        ? "Remove professional profile"
        : "Delete account";

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
          title={removeProfileButtonTitle}
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
