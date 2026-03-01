/* eslint-disable react/react-in-jsx-scope */
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { CaretLeft, UserCircle } from "phosphor-react-native";
import { useLocalSearchParams } from "expo-router";
import { useClientSearch } from "@/src/api/profiles";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { useEffect, useState } from "react";
import { Colors } from "@/src/constants/Colors";
import { router } from "expo-router";
import ProfileRectangle from "@/src/components/profileRectangles";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import { getFriendRequestStatus } from "@/src/api/notifications/api";
import { checkRelationship } from "@/src/api/relationships";
import { isBlocked, unblockUser } from "@/src/api/moderation";
import CustomAlert from "@/src/components/CustomAlert";
import { useQueryClient } from "@tanstack/react-query";
import { 
  responsiveScale, 
  scalePercent, 

  responsiveFontSize,
  responsiveBorderRadius
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const UserProfile = () => {
  const { id: client_id } = useLocalSearchParams();
  const { data: profileData } = useClientSearch(client_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
        phone_number: profileData.phoneNumber ?? profileData.phone_number,
        about_me: profileData.aboutMe ?? profileData.about_me,
        hair_structure: profileData.hairStructure ?? profileData.hair_structure,
        hair_thickness: profileData.hairThickness ?? profileData.hair_thickness,
        natural_hair_color: profileData.naturalHairColor ?? profileData.natural_hair_color,
        grey_hair_percentage: profileData.greyHairPercentage ?? profileData.grey_hair_percentage,
      }
    : undefined;
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRelated, setIsRelated] = useState<boolean | null>(null);
  const hairdresser_id = session?.user.id;
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to check if a field has valid content
  const hasContent = (field) => {
    if (!field || field === "undefined" || field === "null") return false;

    const trimmed = field.toString().trim();
    if (trimmed === "" || trimmed === "{}" || trimmed === "[]") return false;

    // Check if it's a JSON string that contains empty object/array
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object") {
        return Object.keys(parsed).length > 0;
      }
    } catch (e) {
      // Not JSON, just check if it's not empty
    }

    return true;
  };

  useEffect(() => {
    const checkRequestStatus = async () => {
      try {
        const status = await getFriendRequestStatus(hairdresser_id);
        setRequestStatus(status);
      } catch (error) {
        console.error("Error checking request status:", error);
      }
    };

    if (hairdresser_id && client_id) {
      checkRequestStatus();
    }
  }, [hairdresser_id, client_id]);

  useEffect(() => {
    const checkBlocked = async () => {
      if (client_id && hairdresser_id) {
        const blocked = await isBlocked(hairdresser_id, client_id);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [client_id, hairdresser_id]);

  useEffect(() => {
    const checkRel = async () => {
      try {
        const exists = await checkRelationship(hairdresser_id, client_id);
        setIsRelated(exists);
      } catch (error) {
        console.error("Error checking relationship:", error);
      }
    };

    if (hairdresser_id && client_id) {
      checkRel();
    }
  }, [hairdresser_id, client_id]);

  const handleRequestHaircode = async () => {
    setAlertVisible(true);
    setLoading(true);
    try {
      const message = `${profile.full_name} asked for access to your haircodes`;
      const title = "New Haircode Request";

      await sendPushNotification(
        client_id,
        hairdresser_id,
        "FRIEND_REQUEST",
        message,
        {
          isClient: false,
          senderName: profile.full_name,
          senderAvatar: profile.avatar_url,
          status: "pending",
        },
        title
      );

      setRequestStatus("pending");
    } catch (err) {
      console.error("Error sending haircode request:", err);
      Alert.alert("Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.container}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconContainer}
            >
              <CaretLeft size={responsiveScale(32)} color={Colors.dark.dark} />
            </Pressable>

            <ProfileRectangle
              full_name={data?.full_name}
              phone_number={isRelated ? data?.phone_number : null}
            />

            <View>
              {data ? (
                data.avatar_url ? (
                  <AvatarWithSpinner uri={data.avatar_url} size={scalePercent(25)} style={styles.profilePic} />
                ) : (
                  <View style={styles.profilePicPlaceholder}>
                    <UserCircle size={scalePercent(25) * 0.6} color={Colors.dark.dark} />
                  </View>
                )
              ) : (
                <UserCircle size={scalePercent(25) * 0.6} color={Colors.dark.dark} />
              )}
            </View>

            {isRelated && !isBlockedUser && (
              <View style={styles.stack}>
                {/* Only show about me section if it has content */}
                {hasContent(data?.about_me) && (
                  <>
                    <Text style={styles.FirstTextHeader}>About me</Text>
                    <View style={styles.aboutContainer}>
                      <Text style={styles.aboutText}>{data?.about_me}</Text>
                    </View>
                  </>
                )}

                
                {hasContent(data?.hair_structure) && (
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.TextHeader}>Hair structure</Text>
                    <View style={styles.dropDownContainers}>
                      <Text style={[styles.aboutHairText, { fontSize: responsiveFontSize(16, 14) }]}>
                        {data?.hair_structure}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Only show hair thickness if it has content */}
                {hasContent(data?.hair_thickness) && (
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.TextHeader}>Hair thickness</Text>
                    <View style={styles.dropDownContainers}>
                      <Text style={[styles.aboutHairText, { fontSize: responsiveFontSize(16, 14) }]}>
                        {data?.hair_thickness}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Only show natural hair color if it has content */}
                {hasContent(data?.natural_hair_color) && (
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.TextHeader}>Natural hair color</Text>
                    <View style={styles.dropDownContainers}>
                      <Text style={[styles.aboutHairText, { fontSize: responsiveFontSize(16, 14) }]}>
                        {data?.natural_hair_color}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Only show grey hair percentage if it has content */}
                {hasContent(data?.grey_hair_percentage) && (
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.TextHeader}>Grey hair percentage</Text>
                    <View style={styles.dropDownContainers}>
                      <Text style={[styles.aboutHairText, { fontSize: responsiveFontSize(16, 14) }]}>
                        {data?.grey_hair_percentage}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {isBlockedUser ? (
              <View style={styles.buttonView}>
                <MyButton
                  style={[styles.addButton, { borderColor: "red" }]}
                  text="Unblock"
                  textSize={18}
                  textTabletSize={14}
                  onPress={async () => {
                    await unblockUser(hairdresser_id, client_id, queryClient);
                    setIsBlockedUser(false);
                    Alert.alert("User unblocked");
                  }}
                />
              </View>
            ) : isRelated === false ? (
              <View style={styles.buttonView}>
                <MyButton
                  style={styles.addButton}
                  text={
                    requestStatus === "pending"
                      ? "Pending request ..."
                      : "Ask client for haircode"
                  }
                  textSize={18}
                  textTabletSize={14}
                  onPress={handleRequestHaircode}
                  disabled={loading}
                />
              </View>
            ) : null}
          </View>

          {/* Custom Alert */}
          <CustomAlert
            visible={alertVisible}
            title="Request Sent"
            message="Waiting for client to accept your request."
            onClose={() => setAlertVisible(false)}
          />
        </ScrollView>
      </View>
    </>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: responsiveScale(100),
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
  },
  profilePicPlaceholder: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
  },
  stack: {
    marginTop: responsiveScale(224, 326),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
  },
  FirstTextHeader: {
    fontSize: responsiveFontSize(20, 16),
    marginTop: responsiveScale(80),
    fontFamily: "Inter-SemiBold",
    marginBottom: responsiveScale(10),
    textAlign: "left",
    width: scalePercent(90),
  },
  TextHeader: {
    fontSize: responsiveFontSize(20, 16),
    marginTop: responsiveScale(35),
    fontFamily: "Inter-SemiBold",
    marginBottom: responsiveScale(10),
    textAlign: "left",
    marginRight: scalePercent(10),
    width: scalePercent(40),
  },
  aboutText: {
    textAlign: "left",
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-Regular",
    marginTop: "0%",
  },
  aboutContainer: {
    backgroundColor: Colors.dark.light,
    borderRadius: responsiveBorderRadius(20),
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    width: scalePercent(90),
    padding: scalePercent(5),
  },
  dropDownContainers: {
    backgroundColor: Colors.dark.light,
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    borderRadius: responsiveBorderRadius(20, 10),
    height: responsiveScale(50, 60),
    width: scalePercent(35),
    marginTop: responsiveScale(30),
  },
  scrollViewContent: {
    paddingBottom: responsiveScale(100),
    paddingTop: 0,
  },
  iconContainer: {
    position: "absolute",
    top: responsiveScale(60),
    left: responsiveScale(20),
    zIndex: 10,
  },
  aboutHairRow: {
    flexDirection: "row",
    marginTop: responsiveScale(20, 50)
  },
  aboutHairText: {
    textAlign: "center",
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Regular",
    width: scalePercent(22),
    marginTop: responsiveScale(12),
  },
  buttonView: {
    marginTop: responsiveScale(638, 620),
    marginHorizontal: "5%",
  },
  addButton: {
    borderWidth: responsiveScale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: "transparent",
    width: "95%",
    alignSelf: "center",
    marginTop: "14%",
  },
});