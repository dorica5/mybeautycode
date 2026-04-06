/* eslint-disable no-case-declarations */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { Colors, primaryBlack, primaryWhite } from "../constants/Colors";
import { api } from "@/src/lib/apiClient";
import { markNotificationAsRead } from "@/src/providers/useNotifcations";
import { UserCircle, Users } from "phosphor-react-native";
import { responsiveScale, responsiveFontSize, scalePercent, responsiveBorderRadius } from "../utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "./avatarSpinner";

const CLIENT_CARD_DARK = "#262626";

export type NotificationCardTone = "light" | "dark";

export type NotificationItemProps = {
  notification: Record<string, unknown> & {
    id: string;
    read?: boolean;
    message?: string;
    type?: string;
    sender_id?: string;
    sender?: { avatar_url?: string; full_name?: string };
    data?: Record<string, unknown>;
  };
  /** Client notifications list: mint screen card styles (Today = light, else dark). */
  cardTone?: NotificationCardTone;
};

export const NotificationItem = ({
  notification,
  cardTone,
}: NotificationItemProps) => {
  const [isRead, setIsRead] = useState(notification.read);
  const senderAvatar = notification.sender?.avatar_url;

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

  const fetchHaircodeDetails = async (haircodeId: string) => {
    try {
      const haircode = await api.get<{
        id: string;
        hairdresserId: string;
        hairdresserName: string;
        services: string;
        duration: string;
        createdAt: string;
      }>(`/api/haircodes/${haircodeId}`);
      const hairdresserProfile = await api.get<{
        salonName: string;
        avatarUrl: string;
        salonPhoneNumber: string;
        aboutMe: string;
        bookingSite: string;
        socialMedia: string;
      }>(`/api/profiles/${haircode.hairdresserId}`);
      return {
        haircode: {
          ...haircode,
          hairdresser_id: haircode.hairdresserId,
          hairdresser_name: haircode.hairdresserName,
          created_at: haircode.createdAt,
        },
        hairdresserProfile: {
          salon_name: hairdresserProfile.salonName,
          avatar_url: hairdresserProfile.avatarUrl,
          salon_phone_number: hairdresserProfile.salonPhoneNumber,
          about_me: hairdresserProfile.aboutMe,
          booking_site: hairdresserProfile.bookingSite,
          social_media: hairdresserProfile.socialMedia,
        },
      };
    } catch (error) {
      console.error("Error in fetchHaircodeDetails:", error);
      return null;
    }
  };

  const formatDate = (createdAt) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handlePress = async () => {
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
            isClient: notification.data?.isClient,
            title: notification.title,
            profile_pic: notification.sender?.avatar_url,
          },
        });
        break;

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
          },
        });
        break;

      case "HAIRCODE_ADDED":
      case "HAIRCODE_EDITED":
        if (!notification.data?.haircodeId) {
          console.warn(
            "Missing haircodeId in notification data:",
            notification.data
          );
          Alert.alert(
            "Cannot Open",
            "This notification is missing data. This can happen with older notifications. New haircode notifications will open correctly."
          );
          return;
        }

        const haircodeId = String(notification.data.haircodeId);
        const details = await fetchHaircodeDetails(haircodeId);

        if (details?.haircode) {
          const haircode = details.haircode;
          const hairdresserProfile = details.hairdresserProfile || {};

          router.push({
            pathname: "/haircodes/single_haircode_client",
            params: {
              notificationId: notification.id,
              senderId: notification.sender_id,
              senderName: notification.sender?.full_name || "",
              profile_pic: notification.sender?.avatar_url || "",
              haircodeId: haircode.id,
              hairdresserName: haircode.hairdresser_name || "",
              salon_name: hairdresserProfile.salon_name || "",
              hairdresser_profile_pic: hairdresserProfile.avatar_url || "",
              services: haircode.services || [],
              createdAt: formatDate(haircode.created_at),
              salonPhoneNumber: hairdresserProfile.salon_phone_number || "",
              about_me: hairdresserProfile.about_me || "",
              booking_site: hairdresserProfile.booking_site || "",
              social_media: JSON.stringify(hairdresserProfile.social_media || {}),
              duration: haircode.duration,
              hairdresser_id: haircode.hairdresser_id,
            },
          });
        } else {
          // Fallback: navigate with just haircodeId; screen will fetch from API
          router.push({
            pathname: "/haircodes/single_haircode_client",
            params: {
              notificationId: notification.id,
              senderId: notification.sender_id,
              senderName: notification.sender?.full_name || "",
              profile_pic: notification.sender?.avatar_url || "",
              haircodeId,
            },
          });
        }
        break;

      default:
        console.warn("Unknown notification type:", notification.type);
    }
  };

  const iconColor =
    cardTone === "dark" ? primaryWhite : primaryBlack;

  const avatarOrIcon = senderAvatar ? (
    <AvatarWithSpinner
      uri={senderAvatar}
      size={responsiveScale(40)}
      style={[
        styles.profileImage,
        cardTone === "dark" && styles.profileImageOnDark,
      ]}
    />
  ) : (
    <View
      style={[
        styles.profileImage,
        styles.iconPlaceholder,
        cardTone === "dark" && styles.iconPlaceholderDark,
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
    <TouchableOpacity
      style={[
        cardTone === "light" && styles.clientCardLight,
        cardTone === "dark" && styles.clientCardDark,
        !cardTone && styles.container,
        !cardTone && !isRead && styles.unread,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
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
              cardTone === "light" && styles.messageLight,
              cardTone === "dark" && styles.messageDark,
            ]}
          >
            {notification.message}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
  },
  clientCardDark: {
    marginBottom: responsiveScale(10),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(16),
    borderRadius: responsiveBorderRadius(18),
    backgroundColor: CLIENT_CARD_DARK,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: CLIENT_CARD_DARK,
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