import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
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
  pinSessionProfessionCode,
  setLastAppSurface,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";
import { useI18n } from "@/src/providers/LanguageProvider";

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
  const { t } = useI18n();
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
      return t("authDelete.thisProfessionalProfile");
    }
    return PROFESSION_HEADLINE_ROLE[coercedLaneCode] ?? t("authDelete.thisRole");
  }, [coercedLaneCode, t]);

  const laneAccountLabel = useMemo(() => {
    if (!coercedLaneCode || !PROFESSION_ACCOUNT_LABEL) return null;
    return PROFESSION_ACCOUNT_LABEL[coercedLaneCode] ?? null;
  }, [coercedLaneCode]);

  const alertBody = useMemo(() => {
    if (scope === "professional") {
      const youRemove =
        laneAccountLabel ?? laneTitle;
      return t("authDelete.deleteProLaneBody", { role: youRemove });
    }
    return t("authDelete.deleteClientBody", { brand: BRAND_DISPLAY_NAME });
  }, [scope, laneAccountLabel, laneTitle, t]);

  const onDelete = async () => {
    if (!profile?.id) {
      Alert.alert(t("common.error"), t("profile.userNotFound"));
      return;
    }
    setAlertVisible(false);
    setLoading(true);
    try {
      if (scope === "professional") {
        if (!professionCodeParam) {
          Alert.alert(
            t("authDelete.couldNotDelete"),
            t("authDelete.switchAccountToDelete")
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
        if (!profileHasProfessionalCapability(next)) {
          pinSessionProfessionCode(null);
          await setLastAppSurface(profile.id, "client");
          router.replace("/(client)/(tabs)/home" as Href);
        } else {
          const remaining =
            codes
              .map((c) => coerceProfessionCode(c))
              .find((c) => c != null && c !== canonical) ??
            coerceProfessionCode(codes[0]);
          if (remaining) {
            pinSessionProfessionCode(remaining);
            await setLastProfessionCode(profile.id, remaining);
          }
          router.replace("/(professional)/(tabs)/profile" as Href);
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
        t("common.error"),
        (error as Error).message || t("common.unexpectedError")
      );
      console.error("Error deleting:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (scope === "professional" && !professionCodeParam) {
      Alert.alert(
        t("authDelete.couldNotDelete"),
        t("authDelete.switchAccountToDelete")
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
        ? t("authDelete.removeRoleAccount", {
            role: PROFESSION_HEADLINE_ROLE[coercedLaneCode].toLowerCase(),
          })
        : t("authDelete.removeRoleAccount", { role: laneTitle })
      : t("authDelete.deleteAccountPermanently");

  const removeProfileButtonTitle =
    scope === "professional" &&
    coercedLaneCode &&
    PROFESSION_HEADLINE_ROLE &&
    PROFESSION_HEADLINE_ROLE[coercedLaneCode]
      ? t("authDelete.removeRoleProfile", {
          role: PROFESSION_HEADLINE_ROLE[coercedLaneCode].toLowerCase(),
        })
      : scope === "professional"
        ? t("authDelete.removeProfessionalProfile")
        : t("authDelete.deleteAccountButton");

  return (
    <MintProfileScreenShell>
      <TopNav title={t("authDelete.deleteAccountTitle")} />
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
          title={scope === "professional" ? t("authDelete.removeProfileConfirm") : t("authDelete.deleteAccountTitle")}
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
