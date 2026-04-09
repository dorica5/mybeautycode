/* eslint-disable react/react-in-jsx-scope */
import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { CaretLeft, DotsThree } from "phosphor-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAddHairdresser, useClientSearch } from "@/src/api/profiles";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import OpenUrl from "@/src/components/OpenUrl";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { Colors } from "@/src/constants/Colors";
import ProfileRectangle from "@/src/components/profileRectangles";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  moderationDetailCopy,
} from "@/src/components/moderation/ModerationSheetParts";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  blockUser,
  isBlocked,
  REPORT_REASONS,
  ReportReason,
  reportUserEnhanced,
  unblockUser,
} from "@/src/api/moderation";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck } from "@/src/api/relationships";
import { useRemoveRelationships } from "@/src/api/profiles";
import { primarySocialUrl } from "@/src/lib/socialMediaStorage";
import {
  responsiveScale,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { PublicProfileWorkGrid } from "@/src/components/PublicProfileWorkGrid";

const ProfessionalProfileScreen = () => {
  const { id: hairdresser_id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const client_id = session?.user.id;

  const queryClient = useQueryClient();

  const { data: profileData } = useClientSearch(hairdresser_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
        about_me: profileData.aboutMe ?? profileData.about_me,
        salon_name: profileData.salonName ?? profileData.salon_name,
        salon_phone_number: profileData.salonPhoneNumber ?? profileData.salon_phone_number,
        booking_site: profileData.bookingSite ?? profileData.booking_site,
        social_media: profileData.socialMedia ?? profileData.social_media,
      }
    : undefined;
  const { data: isRelated = false, isFetching: relLoading } = useRelationshipCheck(
    client_id ?? undefined,
    hairdresser_id
  );
  const removeRelationships = useRemoveRelationships(client_id ?? "");

  // block state
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [blockCheckComplete, setBlockCheckComplete] = useState(false);

  // modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // mutations
  const [loading, setLoading] = useState(false);
  const { mutateAsync: addHairdresserDB } = useAddHairdresser(
    hairdresser_id,
    client_id
  );

  // check blocked
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (client_id && hairdresser_id) {
          const blocked = await isBlocked(
            client_id as string,
            hairdresser_id as string
          );
          if (alive) setIsBlockedUser(blocked);
        }
      } catch (e) {
        console.error("Error checking blocked:", e);
      } finally {
        if (alive) setBlockCheckComplete(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [client_id, hairdresser_id]);

  const deleteHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    try {
      await removeRelationships.mutateAsync([hairdresser_id]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["relationship", client_id, hairdresser_id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["listAllHairdresserSearch", client_id],
        }),
      ]);
      router.replace({
        pathname: "/(client)/userList/professionalProfile/[id]",
        params: { id: hairdresser_id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to delete user.");
    }
  }, [client_id, hairdresser_id, queryClient, removeRelationships]);

  const addHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    setLoading(true);
    try {
      await addHairdresserDB();

      const message = `${profile?.full_name} has added you as their hairdresser.`;
      await sendPushNotification(
        hairdresser_id,
        client_id,
        "FRIEND_REQUEST",
        message,
        {
          isClient: true,
          senderName: profile?.full_name,
          senderAvatar: profile?.avatar_url,
        },
        "New Client Added"
      );

      await queryClient.invalidateQueries({
        queryKey: ["relationship", client_id, hairdresser_id],
      });
    } catch (error) {
      console.error("Error adding hairdresser:", error);
      Alert.alert("Error", "Failed to add hairdresser.");
    } finally {
      setLoading(false);
    }
  }, [addHairdresserDB, hairdresser_id, client_id, profile, queryClient]);

  const handlePhoneCall = useCallback(async () => {
    const phoneUrl = `tel:${data?.salon_phone_number}`;
    const supported = await Linking.canOpenURL(phoneUrl);
    if (supported) Linking.openURL(phoneUrl);
    else Alert.alert("Error", "Your device does not support phone calls.");
  }, [data?.salon_phone_number]);

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const handleUnblock = async () => {
    try {
      await unblockUser(client_id, hairdresser_id);
      setIsBlockedUser(false);
      Alert.alert("User unblocked");
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user");
    }
  };

  const handleBlock = async (reason: string) => {
    try {
      await blockUser(client_id, hairdresser_id, reason, queryClient);
      Alert.alert(
        "Account blocked",
        `They can no longer reach you through ${BRAND_DISPLAY_NAME}.`
      );
      setActiveAction(null);
      setIsBlockedUser(true);
    } catch (error) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", "Failed to block user");
    }
  };

  const handleReport = async (reason: ReportReason) => {
    try {
      const result = await reportUserEnhanced(
        client_id,
        hairdresser_id,
        reason,
        queryClient
      );

      if (result.autoBlocked) {
        Alert.alert(
          "Report received",
          "Thanks for letting us know. This account was restricted after repeated reports."
        );
      } else {
        Alert.alert("Report received", result.message);
      }

      setActiveAction(null);
    } catch (error) {
      if (error.message === "You have already reported this user") {
        Alert.alert(
          "Already reported",
          "You have already submitted a report for this account."
        );
      } else {
        console.error("Error reporting user:", error);
        Alert.alert("Error", "Failed to report user");
      }
      setActiveAction(null);
    }
  };

  const moderationPrimaryContent = (
    <View>
      <ModerationSheetHeading
        title="Safety & privacy"
        subtitle={`Manage how you interact with this professional on ${BRAND_DISPLAY_NAME}.`}
      />
      {isRelated && (
        <RapportUserModal
          title="Delete"
          top
          onPress={() => handleModalOption("Delete")}
        />
      )}
      <RapportUserModal
        title="Block"
        top={!isRelated}
        onPress={() => handleModalOption("Block")}
      />
      <RapportUserModal
        title="Report"
        bottom={!isRelated}
        onPress={() => handleModalOption("Report")}
      />
      <RapportUserModal
        title="Cancel"
        top
        bottom
        onPress={() => setIsModalVisible(false)}
      />
    </View>
  );

  const renderModerationDetail = () => {
    const copy =
      activeAction === "Delete"
        ? moderationDetailCopy.removeProfessional
        : activeAction === "Block"
          ? moderationDetailCopy.block
          : activeAction === "Report"
            ? moderationDetailCopy.report
            : { title: "", subtitle: "" };

    return (
      <View>
        {copy.title ? (
          <ModerationSheetHeading title={copy.title} subtitle={copy.subtitle} />
        ) : null}

        {activeAction === "Delete" && (
          <>
            <ModerationReasonRow
              label="Remove professional"
              danger
              onPress={async () => {
                await deleteHairdresser();
                setActiveAction(null);
              }}
            />
            <ModerationReasonRow
              label="Not now"
              onPress={() => setActiveAction(null)}
            />
          </>
        )}
        {activeAction === "Block" &&
          [
            "No reason",
            "Spam, fake profile",
            "Inappropriate content",
          ].map((reason, idx) => (
            <ModerationReasonRow
              key={`${reason}-${idx}`}
              label={reason}
              onPress={() => handleBlock(reason)}
            />
          ))}

        {activeAction === "Report" &&
          REPORT_REASONS.map((reason) => (
            <ModerationReasonRow
              key={reason.value}
              label={reason.label}
              onPress={() => handleReport(reason.value)}
            />
          ))}
      </View>
    );
  };

  // Helper function to check if a field has valid content
  const hasContent = (field) => {
    return (
      field &&
      field.toString().trim() !== "" &&
      field !== "undefined" &&
      field !== "null"
    );
  };

  if (!blockCheckComplete || relLoading) return null;

  return (
    <>
    <StatusBar style="dark" backgroundColor= {Colors.dark.warmGreen} />
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: scalePercent(40), flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.iconContainer}>
        <CaretLeft size={32} color={Colors.dark.dark} />
      </Pressable>

      {!isBlockedUser && (
        <View style={styles.moreIconContainer}>
          <Pressable onPress={() => setIsModalVisible(true)}>
            <DotsThree size={32} color={Colors.dark.dark} weight="bold" />
          </Pressable>
        </View>
      )}

      <ProfileRectangle full_name={data?.full_name} />
      <View style={styles.profileContainer}>
        <AvatarWithSpinner
          uri={data?.avatar_url}
          size={scalePercent(25)}
          style={styles.profilePic}
        />
      </View>

      {/* Show only unblock button if user is blocked */}
      {isBlockedUser ? (
        <View style={styles.stack}>
        <MyButton
          style={[styles.addButton, { borderColor: "red" }]}
          text="Unblock"
          onPress={handleUnblock}
        />
        </View>
      ) : (
        /* Show profile content only if user is not blocked */
        <View style={styles.stack}>
          {!isRelated ? (
            <MyButton
              style={styles.addButton}
              text="Add hairdresser"
              onPress={addHairdresser}
              disabled={loading}
            />
          ) : (
            <MyButton
              style={[styles.addedButton, { opacity: 0.5 }]}
              text="Hairdresser added!"
              disabled
            />
          )}

          {/* Only show about me if it has content */}
          {hasContent(data?.about_me) && (
            <View style={styles.aboutContainer}>
              <Text style={styles.bio}>{data?.about_me}</Text>
            </View>
          )}

          {hairdresser_id ? (
            <PublicProfileWorkGrid profileUserId={String(hairdresser_id)} />
          ) : null}

          {/* Only show salon name if it has content */}
          {hasContent(data?.salon_name) && (
            <Text style={styles.salonName}>{data?.salon_name}</Text>
          )}

          {/* Only show phone number if it has content */}
          {hasContent(data?.salon_phone_number) && (
            <View style={[styles.phoneContainer, { marginBottom: "10%" }]}>
              <Text style={styles.label}>Salon phone number: </Text>
              <TouchableOpacity onPress={handlePhoneCall}>
                <Text style={styles.phoneNumber}>
                  {data?.salon_phone_number}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Only show booking site if it has content */}
          {hasContent(data?.booking_site) && (
            <OpenUrl url={data?.booking_site}>Open Booking Site</OpenUrl>
          )}

          {/* Only show social media if it has content */}
          {hasContent(data?.social_media) && (
            <OpenUrl
              url={
                primarySocialUrl(data?.social_media) ??
                data?.social_media ??
                ""
              }
            >
              Open Social Media Account
            </OpenUrl>
          )}
        </View>
      )}

      <SmallDraggableModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onModalHide={() => {
          if (pendingAction) {
            setActiveAction(pendingAction);
            setPendingAction(null);
          }
        }}
        modalHeight="52%"
        sheetVariant="brand"
        renderContent={moderationPrimaryContent}
      />

      {activeAction && (
        <SmallDraggableModal
          isVisible
          onClose={() => setActiveAction(null)}
          modalHeight="72%"
          sheetVariant="brand"
          renderContent={renderModerationDetail()}
        />
      )}
    </ScrollView>
    </>
  );
};

export default ProfessionalProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  iconContainer: {
    position: "absolute",
    top: responsiveScale(60, 50),
    left: responsiveScale(20, 16),
    zIndex: 10,
  },
  moreIconContainer: {
    position: "absolute",
    top: responsiveScale(60, 50),
    right: responsiveScale(20, 16),
    zIndex: 10,
  },

  profileContainer: {
    alignItems: "center",
    marginTop: responsiveScale(58, 34), 
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  profilePlaceholder: {
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.yellowish,
  },

  stack: {
    marginTop: responsiveScale(220, 300),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
  },

  salonName: {
    textAlign: "center",
    fontSize: responsiveFontSize(25, 18),
    fontFamily: "Inter-Regular",
    marginTop: responsiveScale(20, 14),
  },
  phoneContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: responsiveScale(20, 14),
  },
  label: {
    fontSize: responsiveFontSize(20, 14),
    fontFamily: "Inter-Regular",
  },
  phoneNumber: {
    color: Colors.light.warmGreen,
    textDecorationLine: "underline",
    fontSize: responsiveFontSize(20, 14),
    fontFamily: "Inter-SemiBold",
  },

  bio: {
    textAlign: "left",
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-Regular",
    marginTop: 0,
  },
  aboutContainer: {
    marginTop: responsiveScale(40, 30),
    backgroundColor: Colors.dark.light,
    borderRadius: responsiveBorderRadius(20, 14),
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3, 2),
    width: scalePercent(90),
    padding: scalePercent(5),
  },

  addButton: {
    borderWidth: 2,
    borderColor: Colors.light.warmGreen,
    backgroundColor: "transparent",
    width: scalePercent(83),
    alignSelf: "center",
    marginTop: responsiveScale(38, - 80),
    borderRadius: responsiveBorderRadius(25, 18),
  },
  addedButton: {
    borderWidth: 2,
    borderColor: Colors.light.warmGreen,
    backgroundColor: "transparent",
    width: scalePercent(83),
    alignSelf: "center",
    marginTop: responsiveScale(38, 120),
    borderRadius: responsiveBorderRadius(25, 18),
  },
});
