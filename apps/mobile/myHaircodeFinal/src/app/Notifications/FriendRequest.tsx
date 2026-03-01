import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/src/lib/apiClient";
import {
  getNotification,
  respondToFriendRequest,
} from "@/src/api/notifications/api";
import MyButton from "@/src/components/MyButton";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import { useAuth } from "@/src/providers/AuthProvider";
import { Colors } from "@/src/constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import TopNav from "@/src/components/TopNav";
import RemoteImage from "@/src/components/RemoteImage";
import { UserCircle } from "phosphor-react-native";
import { isBlocked } from "@/src/api/moderation";
import { responsiveScale, responsiveFontSize, scalePercent } from "@/src/utils/responsive";
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
      if (accepted && !isClientRequest) {
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

      await respondToFriendRequest(notificationId as string, accepted);
      setIsHandled(true);
    } catch (error) {
      console.error("Error handling friend request:", error);
      Alert.alert("Error", "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav title="" />
      </SafeAreaView>
    );
  }

  if (isClientRequest) {
    return (
      <>
        <StatusBar style="dark" backgroundColor="#fff" />
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <SafeAreaView style={styles.container}>
            <TopNav title="New Client" />
            <View style={styles.subContainer}>
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
                {profile_pic ? (
                  <AvatarWithSpinner uri={profile_pic} size={responsiveScale(55)} style={styles.profileImage} />
                 
                ) : (
                  <View
                    style={[
                      styles.profileImage,
                      { justifyContent: "center", alignItems: "center" },
                    ]}
                  >
                    <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} />
                  </View>
                )}
                <Text style={[styles.name, {fontSize: responsiveFontSize(16, 14)}]}>{senderName}</Text>
              </Pressable>
              <Text style={[styles.message, {fontSize: responsiveFontSize(16, 12)}]}>
                has added you as their hairdresser.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <TopNav title="Haircode Request" />
          <View style={styles.subContainer}>
            <Pressable
              style={styles.profileColumn}
              onPress={
                !isBlockedUser
                  ? () =>
                      router.push({
                        pathname: `../(client)/(tabs)/userList/hairdresserProfile/${senderId}`,
                        params: {
                          id: senderId,
                          relationship: isHandled ? "true" : "false",
                        },
                      })
                  : null
              }
            >
              {profile_pic ? (
                <RemoteImage
                  highResPath={profile_pic || "default_avatar_url"}
                  storage="avatars"
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} />
                </View>
              )}
              <Text style={[styles.name, {fontSize: responsiveFontSize(16, 14)}]}>{senderName}</Text>
            </Pressable>

            <Text style={[styles.message, {fontSize: responsiveFontSize(16, 12)}]}>wants access to your haircodes.</Text>

            {!isHandled && (
              <View style={styles.buttonContainer}>
                <MyButton
                  text="Accept"
                  textSize={18}
                  textTabletSize={14}
                  onPress={() => handleResponse(true)}
                  disabled={loading}
                  style={styles.acceptButton}
                />
                <MyButton
                  text="Decline"
                  textSize={18}
                  textTabletSize={14}
                  onPress={() => handleResponse(false)}
                  disabled={loading}
                  style={styles.declineButton}
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: responsiveScale(20),
  },
  subContainer: {
    flex: 1,
    alignItems: "center",
  },
  profileColumn: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: scalePercent(10),
    gap: responsiveScale(8),
  },
  profileImage: {
    width: responsiveScale(55),
    height: responsiveScale(55),
    borderRadius: responsiveScale(30),
    backgroundColor: Colors.dark.yellowish,
  },
  name: {
    fontFamily: "Inter-SemiBold",
    lineHeight: responsiveFontSize(24, 20),
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginTop: scalePercent(5),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: responsiveScale(10),
    marginTop: scalePercent(20),
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
});

export default FriendRequest;