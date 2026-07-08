import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavBackRow } from "@/src/components/NavBackRow";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { MintBrandModalPrimaryButton } from "@/src/components/MintBrandModal";
import { markNotificationAsRead } from "@/src/providers/useNotifcations";
import { useBlockedBySender } from "@/src/api/moderation";
import { useAuth } from "@/src/providers/AuthProvider";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import { professionRoleLabelFromCode } from "@/src/i18n/notificationCopy";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Client inbox — pro accepted (or connection confirmed). Shows who you are
 * connected with and opens their lane-scoped public profile.
 */
export default function ConnectionConfirmed() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const {
    notificationId,
    senderId,
    senderName,
    profile_pic,
    professionCode,
    profession_code,
  } = useLocalSearchParams();

  const displayName = firstParam(senderName)?.trim() || t("common.someone");
  const proId = firstParam(senderId);
  const lane = coerceProfessionCode(
    firstParam(professionCode) ?? firstParam(profession_code) ?? undefined
  );
  const roleLabel = professionRoleLabelFromCode(t, lane);
  const message = t("notifications.isNowYour", {
    name: displayName,
    role: roleLabel,
  });

  const { isBlockedBySender, ready: blockStateReady } = useBlockedBySender(
    profile?.id,
    proId,
    lane
  );

  useEffect(() => {
    const id = firstParam(notificationId);
    if (id) {
      void markNotificationAsRead(id).catch((err) => {
        console.error("Error marking connection notification read:", err);
      });
    }
  }, [notificationId]);

  const openProfessionalProfile = () => {
    if (!proId || isBlockedBySender) return;
    router.push({
      pathname:
        "/(client)/(tabs)/userList/professionalProfile/[id]" as Href,
      params: {
        id: proId,
        relationship: "true",
        ...(lane ? { profession: lane } : {}),
      },
    });
  };

  if (!blockStateReady) {
    return (
      <ThemedRouteLoading accessibilityLabel={t("profile.loadingProfile")} />
    );
  }

  const showSenderProfile = !isBlockedBySender;

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <NavBackRow
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityLabel={t("notifications.goBack")}
          hitSlop={12}
        />

        <View style={styles.content}>
          {showSenderProfile ? (
            <Pressable
              style={styles.profileColumn}
              onPress={openProfessionalProfile}
              accessibilityRole="button"
              accessibilityLabel={t("common.viewProfile")}
            >
              <AvatarWithSpinner
                uri={firstParam(profile_pic)}
                size={responsiveScale(86)}
                style={styles.avatar}
              />
              <Text style={[Typography.h3, styles.name]}>{displayName}</Text>
            </Pressable>
          ) : null}

          <Text style={[Typography.bodyMedium, styles.message]}>{message}</Text>
          {isBlockedBySender ? (
            <Text style={[Typography.bodySmall, styles.blockedHint]}>
              {t("notifications.profileUnavailableBlocked")}
            </Text>
          ) : null}

          {showSenderProfile ? (
            <View style={styles.action}>
              <MintBrandModalPrimaryButton
                label={t("common.viewProfile")}
                onPress={openProfessionalProfile}
                disabled={!proId}
                accessibilityLabel={t("common.viewProfile")}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  backRow: {
    alignSelf: "flex-start",
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsiveMargin(12),
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
    paddingTop: responsiveMargin(12),
  },
  profileColumn: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: scalePercent(6),
    gap: responsiveScale(10),
  },
  avatar: {
    borderRadius: responsiveScale(999),
    backgroundColor: primaryGreen,
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  name: {
    textAlign: "center",
    marginTop: responsiveMargin(8),
  },
  message: {
    textAlign: "center",
    marginTop: responsiveMargin(18),
    maxWidth: 360,
    color: primaryBlack,
    opacity: 0.92,
  },
  blockedHint: {
    textAlign: "center",
    marginTop: responsiveMargin(14),
    maxWidth: 360,
    color: primaryBlack,
    opacity: 0.72,
  },
  action: {
    marginTop: responsiveMargin(28),
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
  },
});
