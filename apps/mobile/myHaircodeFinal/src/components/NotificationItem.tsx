/* eslint-disable no-case-declarations */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import RemoteImage from "./RemoteImage";
import { Colors } from "../constants/Colors";
import { api } from "@/src/lib/apiClient";
import { markNotificationAsRead } from "@/src/providers/useNotifcations";
import { responsiveScale, responsiveFontSize, scalePercent, responsiveBorderRadius } from "../utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "./avatarSpinner";

export const NotificationItem = ({ notification }) => {
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

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableOpacity
          style={[styles.container, !isRead && styles.unread]}
          onPress={handlePress}
        >
          <View style={styles.contentContainer}>
            <View style={styles.row}>
              <AvatarWithSpinner
                uri={senderAvatar}
                size={responsiveScale(40)}
                style={styles.profileImage}
              />

              <Text style={[styles.message, {fontSize: responsiveFontSize(14, 12)}]}>{notification.message}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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