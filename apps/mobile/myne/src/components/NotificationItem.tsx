/* eslint-disable no-case-declarations */
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, primaryBlack, primaryWhite } from "../constants/Colors";
import { markNotificationAsRead } from "@/src/providers/useNotifcations";
import { fetchHaircodeWithMedia } from "@/src/api/visits";
import { useAuth } from "@/src/providers/AuthProvider";
import CustomAlert from "@/src/components/CustomAlert";
import { UserCircle, Users } from "phosphor-react-native";
import { responsiveScale, responsiveFontSize, scalePercent, responsiveBorderRadius } from "../utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "./avatarSpinner";
import {
  formatVisitListDateForLocale,
  useI18n,
} from "@/src/providers/LanguageProvider";
import { localizedNotificationMessage } from "@/src/i18n/notificationCopy";
import {
  pushNotificationProfileNav,
  resolveProToClientProfileNav,
} from "@/src/lib/notificationProfileNavigation";

const CLIENT_CARD_READ_BG = "#FFFFFF";

export type NotificationCardTone = "light" | "dark";

export type NotificationItemProps = {
  notification: Record<string, unknown> & {
    id: string;
    read?: boolean;
    message?: string;
    type?: string;
    status?: string;
    sender_id?: string;
    sender?: { avatar_url?: string; full_name?: string };
    data?: Record<string, unknown>;
  };
  /** Mint inbox card layout; unread/read colors are derived from read state. */
  cardTone?: NotificationCardTone;
};

export const NotificationItem = ({
  notification,
  cardTone,
}: NotificationItemProps) => {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const [visitUnavailableVisible, setVisitUnavailableVisible] = useState(false);
  const [isRead, setIsRead] = useState(notification.read);
  const senderAvatar = notification.sender?.avatar_url;
  const senderName =
    (typeof notification.sender?.full_name === "string" &&
    notification.sender.full_name.trim()
      ? notification.sender.full_name.trim()
      : null) ??
    (typeof notification.data?.senderName === "string" &&
    notification.data.senderName.trim()
      ? notification.data.senderName.trim()
      : null);

  const isLinkRequest =
    notification.type === "FRIEND_REQUEST" ||
    notification.type === "link_request";

  const isAcceptedLink = Boolean(
    isLinkRequest &&
      (notification.status === "accepted" ||
        notification.data?.status === "accepted")
  );

  const isRejectedLink = Boolean(
    isLinkRequest &&
      (notification.status === "rejected" ||
        notification.data?.status === "rejected")
  );

  const isClientInitiatedLink = Boolean(
    notification.data?.isClient === true ||
      notification.data?.isClient === "true"
  );

  const professionCodeRaw =
    (notification.data?.profession_code ?? notification.data?.professionCode) as
      | string
      | undefined;
  const professionCode =
    typeof professionCodeRaw === "string" && professionCodeRaw.trim()
      ? professionCodeRaw.trim()
      : null;

  const displayMessage = localizedNotificationMessage(notification, t);

  useEffect(() => {
    setIsRead(Boolean(notification.read));
  }, [notification.id, notification.read]);

  /** Mint inbox: unread = primary black, read = white (ignore date section). */
  const displayCardTone: NotificationCardTone | undefined = cardTone
    ? isRead
      ? "light"
      : "dark"
    : undefined;

  const markAsRead = async () => {
    if (!isRead) {
      setIsRead(true);
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error("Error updating notification:", error);
        setIsRead(false);
      }
    }
  };

  const resolveVisitId = (): string | null => {
    const d = notification.data;
    if (!d) return null;
    for (const key of [
      "haircodeId",
      "haircode_id",
      "serviceRecordId",
      "service_record_id",
    ]) {
      const raw = d[key];
      if (typeof raw === "string" && raw.trim()) return raw.trim();
    }
    return null;
  };

  const loadVisitForNotification = async (visitId: string) => {
    try {
      const row = (await fetchHaircodeWithMedia(visitId)) as Record<
        string,
        unknown
      >;
      const prof =
        (row.professional_profile as Record<string, unknown> | undefined) ??
        (row.professionalProfile as Record<string, unknown> | undefined) ??
        (row.hairdresser_profile as Record<string, unknown> | undefined) ??
        {};
      const hairdresserId =
        (typeof row.hairdresser_id === "string" && row.hairdresser_id) ||
        (typeof row.hairdresserId === "string" && row.hairdresserId) ||
        "";
      const createdRaw = row.created_at ?? row.createdAt;
      const recordData = row.recordData ?? row.record_data;
      const servicesFromRecord =
        typeof recordData === "object" &&
        recordData &&
        typeof (recordData as { services?: unknown }).services === "string"
          ? (recordData as { services: string }).services
          : "";
      return {
        id: visitId,
        hairdresser_id: hairdresserId,
        hairdresser_name:
          (typeof row.hairdresser_name === "string" && row.hairdresser_name) ||
          (typeof row.hairdresserName === "string" && row.hairdresserName) ||
          "",
        services:
          servicesFromRecord ||
          (typeof row.services === "string" ? row.services : "") ||
          (typeof row.service_description === "string"
            ? row.service_description
            : ""),
        duration:
          (typeof row.duration === "string" && row.duration) ||
          (typeof row.durationMinutes === "number"
            ? String(row.durationMinutes)
            : ""),
        created_at:
          typeof createdRaw === "string" || typeof createdRaw === "number"
            ? String(createdRaw)
            : "",
        salon_name:
          (typeof prof.salon_name === "string" && prof.salon_name) ||
          (typeof prof.business_name === "string" && prof.business_name) ||
          "",
        avatar_url:
          (typeof prof.avatar_url === "string" && prof.avatar_url) ||
          (typeof prof.avatarUrl === "string" && prof.avatarUrl) ||
          "",
        salon_phone_number:
          (typeof prof.salon_phone_number === "string" &&
            prof.salon_phone_number) ||
          (typeof prof.business_number === "string" && prof.business_number) ||
          "",
        about_me:
          (typeof prof.about_me === "string" && prof.about_me) ||
          (typeof prof.aboutMe === "string" && prof.aboutMe) ||
          "",
        booking_site:
          (typeof prof.booking_site === "string" && prof.booking_site) ||
          (typeof prof.bookingSite === "string" && prof.bookingSite) ||
          "",
        social_media: prof.social_media ?? prof.socialMedia ?? "",
        client_user_id:
          (typeof row.clientUserId === "string" && row.clientUserId) ||
          (typeof row.client_user_id === "string" && row.client_user_id) ||
          "",
      };
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      const expectedUnavailable =
        status === 404 ||
        status === 403 ||
        msg.includes("not found") ||
        msg.includes("visit not found") ||
        msg.includes("forbidden");
      if (!expectedUnavailable) {
        console.error("Error loading visit for notification:", error);
      }
      return null;
    }
  };

  const formatDate = (createdAt: string) =>
    formatVisitListDateForLocale(locale, createdAt);

  const handlePress = async () => {
    if (isRejectedLink) return;

    if (isAcceptedLink) {
      await markAsRead();

      /** Client added this pro — sender is the client, not a hairdresser. */
      if (isClientInitiatedLink) {
        const clientId =
          typeof notification.sender_id === "string" &&
          notification.sender_id.trim()
            ? notification.sender_id.trim()
            : null;
        if (!clientId) {
          Alert.alert(
            t("notifications.cannotOpen"),
            t("notifications.cannotOpenMissingClient")
          );
          return;
        }
        router.push({
          pathname: "/Notifications/FriendRequest",
          params: {
            notificationId: notification.id,
            senderId: clientId,
            senderName: senderName ?? notification.sender?.full_name ?? "",
            isClient: "true",
            profile_pic: notification.sender?.avatar_url,
            ...(professionCode ? { professionCode } : {}),
          },
        });
        return;
      }

      const proId =
        typeof notification.sender_id === "string" &&
        notification.sender_id.trim()
          ? notification.sender_id.trim()
          : null;
      if (!proId) {
        Alert.alert(
          t("notifications.cannotOpen"),
          t("notifications.cannotOpenMissingProfessional")
        );
        return;
      }
      router.push({
        pathname: "/Notifications/ConnectionConfirmed",
        params: {
          notificationId: notification.id,
          senderId: proId,
          senderName: senderName ?? notification.sender?.full_name ?? "",
          profile_pic: notification.sender?.avatar_url,
          ...(professionCode ? { professionCode } : {}),
        },
      });
      return;
    }

    await markAsRead();
    console.log("Handling notification type:", notification.type);

    switch (notification.type) {
      case "FRIEND_REQUEST":
      case "link_request":
        router.push({
          pathname: "/Notifications/FriendRequest",
          params: {
            notificationId: notification.id,
            senderId: notification.sender_id,
            senderName: notification.sender?.full_name,
            isClient: isClientInitiatedLink ? "true" : notification.data?.isClient,
            title: notification.title,
            profile_pic: notification.sender?.avatar_url,
            ...(professionCode ? { professionCode } : {}),
          },
        });
        break;

      /** Client accepted link — open pro client hub (new visit, view gallery, …). Sender = client. */
      case "FRIEND_ACCEPTED":
      case "link_accepted": {
        const clientId =
          typeof notification.sender_id === "string" &&
          notification.sender_id.trim()
            ? notification.sender_id.trim()
            : null;
        if (!clientId) {
          Alert.alert(
            t("notifications.cannotOpen"),
            t("notifications.cannotOpenMissingClient")
          );
          break;
        }
        const professionFromData =
          (notification.data?.profession_code ??
            notification.data?.professionCode) as string | undefined;
        const professionCodeNav =
          typeof professionFromData === "string" && professionFromData.trim()
            ? professionFromData.trim()
            : undefined;
        if (!profile?.id) {
          Alert.alert(
            t("notifications.cannotOpen"),
            t("notifications.cannotOpenMissingProfessional")
          );
          break;
        }
        const resolved = await resolveProToClientProfileNav(
          profile.id,
          clientId,
          professionCodeNav ?? null,
          {
            fullName:
              senderName ??
              (typeof notification.sender?.full_name === "string"
                ? notification.sender.full_name
                : ""),
          }
        );
        pushNotificationProfileNav(resolved, t);
        break;
      }

      case "INSPIRATION_SHARED":
        console.log("imageUrls", notification.data?.imageUrls);
        console.log("batchId", notification.data?.batchId);
        router.push({
          pathname: "/Notifications/InspirationNotification",
          params: {
            notificationId: notification.id,
            senderId: notification.sender_id,
            senderName: notification.sender?.full_name,
            imageUrls: notification.data?.imageUrls?.join(","),
            batch_id: notification.data?.batchId,
            profile_pic: notification.sender?.avatar_url,
            ...(professionCode ? { professionCode } : {}),
          },
        });
        break;

      case "HAIRCODE_ADDED":
      case "HAIRCODE_EDITED":
      case "service_record": {
        const visitId = resolveVisitId();
        if (!visitId) {
          console.warn(
            "Missing visit id in notification data:",
            notification.data
          );
          setVisitUnavailableVisible(true);
          return;
        }

        const visit = await loadVisitForNotification(visitId);
        if (!visit) {
          setVisitUnavailableVisible(true);
          return;
        }

        const viewerIsVisitClient =
          Boolean(profile?.id) &&
          visit.client_user_id &&
          String(profile.id) === String(visit.client_user_id);
        const viewerIsVisitPro =
          Boolean(profile?.id) &&
          visit.hairdresser_id &&
          String(profile.id) === String(visit.hairdresser_id);
        const recipientIsClient =
          notification.data?.isClient === false ||
          notification.data?.isClient === "false" ||
          viewerIsVisitClient;

        const visitParams = {
          notificationId: notification.id,
          senderId: notification.sender_id,
          senderName: notification.sender?.full_name || "",
          profile_pic: notification.sender?.avatar_url || "",
          haircodeId: visit.id,
          hairdresserName: visit.hairdresser_name || "",
          salon_name: visit.salon_name || "",
          hairdresser_profile_pic: visit.avatar_url || "",
          services: visit.services || "",
          createdAt: visit.created_at
            ? formatDate(visit.created_at)
            : "",
          salonPhoneNumber: visit.salon_phone_number || "",
          about_me: visit.about_me || "",
          booking_site: visit.booking_site || "",
          social_media:
            typeof visit.social_media === "string"
              ? visit.social_media
              : JSON.stringify(visit.social_media || {}),
          duration: visit.duration || "",
          hairdresser_id: visit.hairdresser_id || "",
          ...(professionCode ? { professionCode } : {}),
        };

        if (recipientIsClient && !viewerIsVisitPro) {
          router.push({
            pathname: "/visits/single_visit_client",
            params: visitParams,
          });
        } else {
          router.push({
            pathname: "/visits/single_visit",
            params: visitParams,
          });
        }
        break;
      }

      default:
        console.warn("Unknown notification type:", notification.type);
    }
  };

  const effectiveTone: NotificationCardTone | undefined = displayCardTone;

  const iconColor =
    effectiveTone === "dark" ? primaryWhite : primaryBlack;

  const avatarOrIcon = senderAvatar ? (
    <AvatarWithSpinner
      uri={senderAvatar}
      size={responsiveScale(40)}
      style={[
        styles.profileImage,
        effectiveTone === "dark" && styles.profileImageOnDark,
      ]}
    />
  ) : (
    <View
      style={[
        styles.profileImage,
        styles.iconPlaceholder,
        effectiveTone === "dark" && styles.iconPlaceholderDark,
      ]}
    >
      {cardTone ? (
        <Users size={responsiveScale(26)} color={iconColor} weight="duotone" />
      ) : (
        <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} />
      )}
    </View>
  );

  const inner = (
    <>
    <TouchableOpacity
      style={[
        displayCardTone === "light" && styles.clientCardLight,
        displayCardTone === "dark" && styles.clientCardDark,
        !cardTone && styles.container,
        !cardTone && !isRead && styles.unread,
      ]}
      onPress={handlePress}
      disabled={isRejectedLink}
      activeOpacity={isRejectedLink ? 1 : 0.85}
    >
      <View
        style={[
          styles.contentContainer,
          cardTone && styles.contentContainerClient,
        ]}
      >
        <View style={[styles.row, cardTone && styles.rowClient]}>
          {avatarOrIcon}
          <Text
            style={[
              styles.message,
              { fontSize: responsiveFontSize(14, 12) },
              effectiveTone === "light" && styles.messageLight,
              effectiveTone === "dark" && styles.messageDark,
            ]}
          >
            {displayMessage}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    <CustomAlert
      visible={visitUnavailableVisible}
      title={t("notifications.visitUnavailableTitle")}
      message={t("notifications.visitUnavailableMessage")}
      onClose={() => setVisitUnavailableVisible(false)}
      compact
    />
    </>
  );

  if (cardTone) {
    return inner;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>{inner}</View>
    </>
  );
};

const styles = StyleSheet.create({
  clientCardLight: {
    marginBottom: responsiveScale(10),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(16),
    borderRadius: responsiveBorderRadius(18),
    backgroundColor: CLIENT_CARD_READ_BG,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
  },
  clientCardDark: {
    marginBottom: responsiveScale(10),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(16),
    borderRadius: responsiveBorderRadius(18),
    backgroundColor: primaryBlack,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
  },
  contentContainerClient: {
    gap: 0,
    borderRadius: 0,
  },
  rowClient: {
    alignItems: "center",
  },
  iconPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  iconPlaceholderDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  profileImageOnDark: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  messageLight: {
    color: primaryBlack,
  },
  messageDark: {
    color: primaryWhite,
  },
  container: {
    paddingVertical: scalePercent(2),
    paddingHorizontal: scalePercent(5),
    borderBottomWidth: responsiveScale(1),
    borderBottomColor: "#eee",
    marginBottom: scalePercent(3),
    marginHorizontal: scalePercent(5),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(10),
  },
  unread: {
    backgroundColor: Colors.dark.warmGreen,
  },
  contentContainer: {
    gap: responsiveScale(10),
    borderRadius: responsiveBorderRadius(30),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(12),
    borderRadius: responsiveBorderRadius(30),
  },
  profileImage: {
    width: responsiveScale(40),
    height: responsiveScale(40),
    borderRadius: responsiveScale(20),
    backgroundColor: Colors.dark.yellowish,
  },
  message: {
    fontFamily: "Inter-Regular",
    flex: 1,
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    aspectRatio: 1,
    borderRadius: responsiveScale(100),
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: scalePercent(15),
  },
});