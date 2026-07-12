import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/src/lib/apiClient";
import {
  getNotification,
  respondToFriendRequest,
} from "@/src/api/notifications/api";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import { useAuth } from "@/src/providers/AuthProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBlockedBySender } from "@/src/api/moderation";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { NavBackRow } from "@/src/components/NavBackRow";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  scalePercent,
  isTablet,
} from "@/src/utils/responsive";
import {
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useI18n } from "@/src/providers/LanguageProvider";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import { clientAddedPushBody } from "@/src/i18n/pushCopy";
import { useQueryClient } from "@tanstack/react-query";
import {
  pushNotificationProfileNav,
  resolveClientToProProfileNav,
  resolveProToClientProfileNav,
} from "@/src/lib/notificationProfileNavigation";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export const FriendRequest = () => {
  const { t } = useI18n();
  const {
    notificationId,
    senderId,
    senderName,
    isClient,
    profile_pic,
    professionCode,
    profession_code,
  } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const [isHandled, setIsHandled] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const senderIdParam = firstParam(senderId);
  const isClientRequest = isClient === "true";
  const displayName = firstParam(senderName)?.trim() || t("common.someone");
  const requestLane = coerceProfessionCode(
    firstParam(professionCode) ?? firstParam(profession_code) ?? undefined
  );
  const blockLane = requestLane ?? activeProfessionCode ?? null;
  const { isBlockedBySender, ready: blockStateReady } = useBlockedBySender(
    profile?.id,
    senderIdParam,
    blockLane
  );

  const clientRequestMessage = clientAddedPushBody(
    t,
    displayName,
    requestLane
  );
  const proRequestMessage = t("notifications.wantsConnectOnBrand", {
    name: displayName,
    brand: BRAND_DISPLAY_NAME,
  });

  const openClientHub = async () => {
    const clientId = senderIdParam;
    if (isBlockedBySender || !clientId || !profile?.id) return;
    const lane =
      firstParam(professionCode)?.trim() ||
      firstParam(profession_code)?.trim() ||
      activeProfessionCode ||
      undefined;
    const resolved = await resolveProToClientProfileNav(
      profile.id,
      clientId,
      lane ?? null,
      { fullName: firstParam(senderName) ?? "" }
    );
    pushNotificationProfileNav(resolved, t, {
      queryClient,
      viewerId: profile.id,
    });
  };

  const openProProfile = async () => {
    if (isBlockedBySender || !senderIdParam || !profile?.id) return;
    const resolved = await resolveClientToProProfileNav(
      profile.id,
      senderIdParam,
      requestLane ?? null
    );
    pushNotificationProfileNav(resolved, t, {
      queryClient,
      viewerId: profile.id,
    });
  };

  useEffect(() => {
    const updateNotificationStatus = async () => {
      try {
        const data = await getNotification(notificationId as string);
        if (data) {
          setIsHandled(
            data.status === "accepted" || data.status === "rejected"
          );
        }
      } catch (error) {
        console.error("Error checking notification status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (notificationId) updateNotificationStatus();
  }, [notificationId]);

  const handleResponse = async (accepted: boolean) => {
    setLoading(true);
    try {
      let clientProfessionalLinkId: string | null = null;
      if (notificationId) {
        try {
          const notifRow = await getNotification(notificationId as string);
          const d = notifRow?.data;
          if (
            d &&
            typeof d === "object" &&
            typeof d.clientProfessionalLinkId === "string"
          ) {
            clientProfessionalLinkId = d.clientProfessionalLinkId;
          }
        } catch {
          // notification fetch is optional for deciding legacy accept path
        }
      }

      await respondToFriendRequest(notificationId as string, accepted);

      if (accepted && !isClientRequest && !clientProfessionalLinkId) {
        await api.post("/api/relationships", {
          hairdresser_id: senderId,
          client_id: profile.id,
        });
        await sendPushNotification(
          senderId,
          profile.id,
          "FRIEND_REQUEST",
          t("push.connectionAcceptedBody", { name: profile.full_name ?? t("common.someone") }),
          {
            isClient: true,
            senderName: profile.full_name,
            senderAvatar: profile.avatar_url,
          },
          t("push.requestAcceptedTitle")
        );
      }

      setIsHandled(true);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/notifications");
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      Alert.alert(t("common.error"), t("notifications.processRequestFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingStatus || !blockStateReady) {
    return (
      <ThemedRouteLoading accessibilityLabel={t("profile.loadingProfile")} />
    );
  }

  const showSenderProfile = !isBlockedBySender;

  if (isClientRequest) {
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
                onPress={openClientHub}
              >
                <AvatarWithSpinner
                  uri={profile_pic}
                  size={responsiveScale(86)}
                  style={styles.avatar}
                />
                <Text style={[Typography.h3, styles.name, styles.nameClient]}>
                  {senderName}
                </Text>
              </Pressable>
            ) : null}
            <Text style={[Typography.bodyMedium, styles.message]}>
              {clientRequestMessage}
            </Text>
            {isBlockedBySender ? (
              <Text style={[Typography.bodySmall, styles.blockedHint]}>
                {t("notifications.profileUnavailableBlocked")}
              </Text>
            ) : null}
            {showSenderProfile ? (
              <View style={styles.viewProfileAction}>
                <MintBrandModalPrimaryButton
                  label={t("common.viewProfile")}
                  onPress={openClientHub}
                  accessibilityLabel={t("common.viewProfile")}
                />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <NavBackRow
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityLabel={t("common.goBack")}
          hitSlop={12}
        />

        <View style={styles.content}>
          {showSenderProfile ? (
            <Pressable
              style={styles.profileColumn}
              onPress={openProProfile}
            >
              <AvatarWithSpinner
                uri={profile_pic}
                size={responsiveScale(86)}
                style={styles.avatar}
              />
              <Text style={[Typography.h3, styles.name]}>{senderName}</Text>
            </Pressable>
          ) : null}

          <Text style={[Typography.bodyMedium, styles.message]}>
            {proRequestMessage}
          </Text>
          {isBlockedBySender ? (
            <Text style={[Typography.bodySmall, styles.blockedHint]}>
              {t("notifications.profileUnavailableBlocked")}
            </Text>
          ) : null}

          {!isHandled && (
            <View
              style={[
                styles.actions,
                isTablet() ? styles.actionsTablet : null,
              ]}
            >
              <MintBrandModalFooterRow>
                <MintBrandModalSecondaryButton
                  label={t("common.decline")}
                  onPress={() => handleResponse(false)}
                  accessibilityLabel={t("notifications.declineRequestA11y")}
                />
                <MintBrandModalPrimaryButton
                  label={loading ? t("inspiration.pleaseWait") : t("common.accept")}
                  onPress={() => handleResponse(true)}
                  accessibilityLabel={t("notifications.acceptRequestA11y")}
                />
              </MintBrandModalFooterRow>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

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
    backgroundColor: primaryWhite,
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  name: {
    textAlign: "center",
  },
  nameClient: {
    marginTop: responsiveMargin(18),
  },
  message: {
    textAlign: "center",
    marginTop: responsiveMargin(16),
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
  viewProfileAction: {
    marginTop: responsiveMargin(26),
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
  },
  actions: {
    marginTop: responsiveMargin(26),
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    paddingHorizontal: responsivePadding(4),
  },
  actionsTablet: {
    maxWidth: 560,
  },
});

export default FriendRequest;