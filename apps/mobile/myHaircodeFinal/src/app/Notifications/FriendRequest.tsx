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
import { isBlocked } from "@/src/api/moderation";
import { CaretLeft } from "phosphor-react-native";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
import {
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

export const FriendRequest = () => {
  const { notificationId, senderId, senderName, isClient, profile_pic } =
    useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const [isHandled, setIsHandled] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isBlockedUser, setIsBlockedUser] = useState(false);

  const isClientRequest = isClient === "true";

  useEffect(() => {
    const checkBlocked = async () => {
      if (profile.id && senderId) {
        const blocked = await isBlocked(senderId, profile.id);
        console.log("User is blocked:", blocked);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [profile.id, senderId]);

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
          `${profile.full_name} has accepted your haircode request`,
          {
            isClient: true,
            senderName: profile.full_name,
            senderAvatar: profile.avatar_url,
          },
          "Request Accepted"
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
      Alert.alert("Error", "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]} />
    );
  }

  if (isClientRequest) {
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <View style={styles.content}>
              <Pressable
                style={styles.profileColumn}
                onPress={
                  !isBlockedUser
                    ? () =>
                        router.push({
                          pathname: `../(hairdresser)/clientProfile/${senderId}`,
                          params: { id: senderId, relationship: "true" },
                        })
                    : null
                }
              >
                <AvatarWithSpinner
                  uri={profile_pic}
                  size={responsiveScale(86)}
                  style={styles.avatar}
                />
                <Text style={[Typography.h3, styles.name]}>{senderName}</Text>
              </Pressable>
            <Text style={[Typography.bodyMedium, styles.message]}>
              wants to connect with you.
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.content}>
            <Pressable
              style={styles.profileColumn}
              onPress={
                !isBlockedUser
                  ? () =>
                      router.push({
                        pathname: `../(client)/(tabs)/userList/professionalProfile/${senderId}`,
                        params: {
                          id: senderId,
                          relationship: isHandled ? "true" : "false",
                        },
                      })
                  : null
              }
            >
              <AvatarWithSpinner
                uri={profile_pic}
                size={responsiveScale(86)}
                style={styles.avatar}
              />
              <Text style={[Typography.h3, styles.name]}>{senderName}</Text>
            </Pressable>

          <Text style={[Typography.bodyMedium, styles.message]}>
            wants access to your visits.
          </Text>

          {!isHandled && (
            <View style={styles.actions}>
              <MintBrandModalFooterRow>
                <MintBrandModalSecondaryButton
                  label="Decline"
                  onPress={() => handleResponse(false)}
                  accessibilityLabel="Decline request"
                />
                <MintBrandModalPrimaryButton
                  label={loading ? "Please wait" : "Accept"}
                  onPress={() => handleResponse(true)}
                  accessibilityLabel="Accept request"
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsiveMargin(12),
    alignSelf: "flex-start",
    gap: responsiveScale(4),
  },
  backLabel: {
    ...Typography.bodySmall,
    color: primaryBlack,
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
  message: {
    textAlign: "center",
    marginTop: responsiveMargin(16),
    maxWidth: 360,
    color: primaryBlack,
    opacity: 0.92,
  },
  actions: {
    marginTop: responsiveMargin(26),
    alignSelf: "stretch",
    maxWidth: 420,
    paddingHorizontal: responsivePadding(4),
  },
});

export default FriendRequest;