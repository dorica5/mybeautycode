/* eslint-disable react/react-in-jsx-scope */
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { CaretLeft, DotsThree } from "phosphor-react-native";
import { useLocalSearchParams } from "expo-router";
import { useClientSearch, requestClientLink } from "@/src/api/profiles";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useCallback, useEffect, useState } from "react";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  Colors,
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { router, useFocusEffect } from "expo-router";
import {
  getClientLinkUiStatus,
  removeRelationship,
  type ClientLinkUiStatus,
} from "@/src/api/relationships";
import {
  isBlocked,
  unblockUser,
  blockUser,
  reportUserEnhanced,
  REPORT_REASONS,
  type ReportReason,
} from "@/src/api/moderation";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  moderationDetailCopy,
} from "@/src/components/moderation/ModerationSheetParts";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import CustomAlert from "@/src/components/CustomAlert";
import { useQueryClient } from "@tanstack/react-query";
import {
  responsiveScale,
  responsiveMargin,
  responsivePadding,
  scalePercent,
  responsiveFontSize,
  responsiveBorderRadius,
} from "@/src/utils/responsive";
import ProfileRectangle from "@/src/components/profileRectangles";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { coerceRouteParam, isUuid } from "@/src/utils/isUuid";

const screenHeight = Dimensions.get("window").height;

const UserProfile = () => {
  const params = useLocalSearchParams<{
    id?: string | string[];
    client_id?: string | string[];
    full_name?: string | string[];
    phone_number?: string | string[];
    relationship?: string | string[];
    price?: string | string[];
  }>();
  const client_id =
    coerceRouteParam(params.id) ?? coerceRouteParam(params.client_id);

  const { data: profileData } = useClientSearch(client_id);

  const invalidClientId = !client_id || !isUuid(client_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        username:
          profileData.username ??
          (profileData as { Username?: string }).Username,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
        phone_number: profileData.phoneNumber ?? profileData.phone_number,
        hair_structure:
          profileData.hairStructure ?? profileData.hair_structure,
        hair_thickness:
          profileData.hairThickness ?? profileData.hair_thickness,
        natural_hair_color:
          profileData.naturalHairColor ?? profileData.natural_hair_color,
        grey_hair_percentage:
          profileData.greyHairPercentage ?? profileData.grey_hair_percentage,
      }
    : undefined;

  const { session, profile: myProfile } = useAuth();
  const { activeProfessionCode } = useActiveProfessionState(myProfile);
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<ClientLinkUiStatus | null>(null);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const hairdresser_id = session?.user.id;

  const paramStr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const navFullName = paramStr(params.full_name);
  const navPhone = paramStr(params.phone_number);

  const refreshLinkState = useCallback(async () => {
    if (!hairdresser_id || !client_id || !isUuid(client_id)) return;
    try {
      const s = await getClientLinkUiStatus(
        String(hairdresser_id),
        client_id,
        activeProfessionCode
      );
      setLinkState(s);
    } catch (error) {
      console.error("Error loading client link state:", error);
      setLinkState("none");
    }
  }, [hairdresser_id, client_id, activeProfessionCode]);

  useFocusEffect(
    useCallback(() => {
      void refreshLinkState();
    }, [refreshLinkState])
  );

  const isRelated = linkState === "active";

  useEffect(() => {
    const checkBlocked = async () => {
      if (client_id && hairdresser_id && isUuid(client_id)) {
        const blocked = await isBlocked(hairdresser_id, client_id);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [client_id, hairdresser_id]);

  const handleAddClient = async () => {
    if (linkState === "pending" || loading || !client_id || !isUuid(client_id))
      return;
    setLoading(true);
    try {
      await requestClientLink(client_id, activeProfessionCode);
      setLinkState("pending");
      await queryClient.invalidateQueries({ queryKey: ["clientSearch"] });
      setAlertVisible(true);
    } catch (err) {
      console.error("Error sending client link request:", err);
      Alert.alert(
        "Request failed",
        err instanceof Error ? err.message : "Could not send the request."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => setIsModalVisible((v) => !v);

  const deleteClient = async (cid: string) => {
    if (!hairdresser_id) return;
    try {
      await removeRelationship(hairdresser_id, cid, activeProfessionCode);
      await queryClient.invalidateQueries({ queryKey: ["clientSearch"] });
      await queryClient.invalidateQueries({
        queryKey: ["latest_haircodes", hairdresser_id],
      });
      setLinkState("none");
      setActiveAction(null);
    } catch {
      Alert.alert("Error", "Failed to remove relationship.");
    }
  };

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const handleReport = async (reason: ReportReason) => {
    if (!client_id || !hairdresser_id) return;
    try {
      const result = await reportUserEnhanced(
        hairdresser_id,
        client_id,
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "You have already reported this user") {
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

  const modalContent = (
    <View>
      <ModerationSheetHeading
        title="Safety & privacy"
        subtitle={`Manage how you interact with this client on ${BRAND_DISPLAY_NAME}.`}
      />
      <RapportUserModal
        title="Delete"
        top={true}
        onPress={() => handleModalOption("Delete")}
      />
      <RapportUserModal
        title="Block"
        top={false}
        bottom={false}
        onPress={() => handleModalOption("Block")}
      />
      <RapportUserModal
        title="Report"
        bottom={true}
        onPress={() => handleModalOption("Report")}
      />
      <RapportUserModal
        title="Cancel"
        top={true}
        bottom={true}
        onPress={() => setIsModalVisible(false)}
      />
    </View>
  );

  const renderSecondaryModal = () => {
    const copy =
      activeAction === "Delete"
        ? moderationDetailCopy.removeClient
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
              label="Remove client"
              danger
              onPress={async () => {
                if (client_id) await deleteClient(client_id);
              }}
            />
            <ModerationReasonRow
              label="Not now"
              onPress={() => setActiveAction(null)}
            />
          </>
        )}
        {activeAction === "Block" &&
          ["No reason", "Spam, fake profile", "Inappropriate content"].map(
            (reason, idx) => (
              <ModerationReasonRow
                key={`${reason}-${idx}`}
                label={reason}
                onPress={async () => {
                  if (!client_id || !hairdresser_id) return;
                  await blockUser(
                    hairdresser_id,
                    client_id,
                    reason,
                    queryClient
                  );
                  Alert.alert(
                    "Account blocked",
                    `They can no longer reach you through ${BRAND_DISPLAY_NAME}.`
                  );
                  setActiveAction(null);
                  setIsBlockedUser(true);
                }}
              />
            )
          )}

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

  const displayUsername =
    typeof data?.username === "string" && data.username.trim()
      ? data.username.trim()
      : null;

  const profileRectPhone =
    data?.phone_number?.trim() || navPhone?.trim() || undefined;

  if (invalidClientId) {
    return (
      <SafeAreaView style={[styles.mintRoot, styles.mintCenter]} edges={["top"]}>
        <StatusBar style="dark" />
        <Text style={[Typography.bodySmall, { color: primaryBlack, textAlign: "center", padding: 24 }]}>
          This profile link is invalid. Go back and open the client again.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (linkState === null) {
    return (
      <SafeAreaView style={[styles.mintRoot, styles.mintCenter]} edges={["top"]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={primaryBlack} />
      </SafeAreaView>
    );
  }

  if (!isRelated) {
    const avatarSize = responsiveScale(120, 144);
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.mintRoot} edges={["top", "left", "right"]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <ScrollView
            contentContainerStyle={styles.mintScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.avatarOuter,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <AvatarWithSpinner
                uri={data?.avatar_url}
                size={avatarSize}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                }}
              />
            </View>

            <Text
              style={[Typography.h3, styles.nameMint]}
              accessibilityRole="header"
            >
              {data?.full_name?.trim() || data?.phone_number || "Client"}
            </Text>
            {displayUsername ? (
              <Text style={[Typography.anton26, styles.usernameMint]}>
                {displayUsername}
              </Text>
            ) : null}

            {isBlockedUser ? (
              <View style={styles.mintButtonWrap}>
                <MyButton
                  style={[styles.unblockMint, { borderColor: "red" }]}
                  text="Unblock"
                  textSize={18}
                  textTabletSize={14}
                  onPress={async () => {
                    await unblockUser(
                      hairdresser_id,
                      String(client_id),
                      queryClient
                    );
                    setIsBlockedUser(false);
                    Alert.alert("User unblocked");
                  }}
                />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.addClientPill,
                  pressed &&
                    linkState === "none" &&
                    !loading && { opacity: 0.85 },
                ]}
                onPress={handleAddClient}
                disabled={linkState === "pending" || loading}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: linkState === "pending" || loading,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={primaryBlack} />
                ) : (
                  <Text style={styles.addClientPillLabel}>
                    {linkState === "pending" ? "Pending..." : "Add client"}
                  </Text>
                )}
              </Pressable>
            )}
          </ScrollView>

          <CustomAlert
            visible={alertVisible}
            title="Request sent"
            message="Waiting for the client to accept your request."
            onClose={() => setAlertVisible(false)}
          />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={styles.whiteProfileRoot}>
        <ScrollView
          contentContainerStyle={styles.whiteScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.whiteProfileInner}>
            <Pressable
              onPress={() => router.back()}
              style={styles.whiteBackIcon}
              hitSlop={12}
            >
              <CaretLeft size={responsiveScale(32)} color={Colors.dark.dark} />
            </Pressable>
            {!isBlockedUser ? (
              <Pressable
                onPress={toggleModal}
                style={styles.whiteMoreIcon}
                hitSlop={12}
                accessibilityLabel="More options"
              >
                <DotsThree
                  size={responsiveScale(32)}
                  color={Colors.dark.dark}
                  weight="bold"
                />
              </Pressable>
            ) : null}

            <ProfileRectangle
              full_name={data?.full_name}
              phone_number={profileRectPhone}
            />
            <View>
              <AvatarWithSpinner
                uri={data?.avatar_url}
                size={scalePercent(25)}
                style={styles.whiteProfilePic}
              />
            </View>

            <View style={styles.whiteStack}>
              {isBlockedUser ? (
                <MyButton
                  style={[styles.whiteUnblockButton, { borderColor: "red" }]}
                  text="Unblock User"
                  textSize={18}
                  textTabletSize={14}
                  onPress={async () => {
                    if (!hairdresser_id || !client_id) return;
                    await unblockUser(
                      hairdresser_id,
                      String(client_id),
                      queryClient
                    );
                    setIsBlockedUser(false);
                    Alert.alert(
                      "User unblocked",
                      "You can now access this user's profile."
                    );
                  }}
                />
              ) : (
                <>
                  {displayUsername ? (
                    <Text style={styles.whiteUsernameCaption}>
                      @{displayUsername}
                    </Text>
                  ) : null}
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.aboutHairHeader}>Hair structure</Text>
                    <View style={styles.dropDownContainers}>
                      <Text
                        style={[
                          styles.aboutHairText,
                          { fontSize: responsiveFontSize(16, 14) },
                        ]}
                      >
                        {data?.hair_structure ?? ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.aboutHairHeader}>Hair thickness</Text>
                    <View style={styles.dropDownContainers}>
                      <Text
                        style={[
                          styles.aboutHairText,
                          { fontSize: responsiveFontSize(16, 14) },
                        ]}
                      >
                        {data?.hair_thickness ?? ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.aboutHairHeader}>
                      Natural hair color
                    </Text>
                    <View style={styles.dropDownContainers}>
                      <Text
                        style={[
                          styles.aboutHairText,
                          { fontSize: responsiveFontSize(16, 14) },
                        ]}
                      >
                        {data?.natural_hair_color ?? ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.aboutHairRow}>
                    <Text style={styles.aboutHairHeader}>
                      Grey hair percentage
                    </Text>
                    <View style={styles.dropDownContainers}>
                      <Text
                        style={[
                          styles.aboutHairText,
                          { fontSize: responsiveFontSize(16, 14) },
                        ]}
                      >
                        {data?.grey_hair_percentage ?? ""}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <SmallDraggableModal
          isVisible={isModalVisible}
          onClose={toggleModal}
          onModalHide={() => {
            if (pendingAction) {
              setActiveAction(pendingAction);
              setPendingAction(null);
            }
          }}
          modalHeight={screenHeight * 0.52}
          sheetVariant="brand"
          renderContent={modalContent}
        />
        <SmallDraggableModal
          isVisible={!!activeAction}
          onClose={() => setActiveAction(null)}
          modalHeight={screenHeight * 0.72}
          sheetVariant="brand"
          renderContent={renderSecondaryModal()}
        />
      </View>
    </>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  mintRoot: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  mintCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  mintScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
    paddingBottom: responsiveMargin(40),
    paddingTop: responsiveMargin(8),
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
  avatarOuter: {
    marginTop: responsiveMargin(16),
    marginBottom: responsiveMargin(20),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  nameMint: {
    textAlign: "center",
    marginBottom: responsiveMargin(8),
  },
  usernameMint: {
    textAlign: "center",
    marginBottom: responsiveMargin(28),
  },
  whiteProfileRoot: {
    flex: 1,
    backgroundColor: "#fff",
  },
  whiteScrollContent: {
    paddingBottom: responsiveScale(100),
    paddingTop: 0,
  },
  whiteProfileInner: {
    flex: 1,
    paddingBottom: responsiveScale(100),
  },
  whiteBackIcon: {
    position: "absolute",
    top: responsiveScale(60),
    left: responsiveScale(20),
    zIndex: 10,
  },
  whiteMoreIcon: {
    position: "absolute",
    top: responsiveScale(60),
    right: responsiveScale(20),
    zIndex: 10,
  },
  whiteProfilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    alignSelf: "center",
    marginTop: responsiveScale(40),
  },
  whiteStack: {
    marginTop: responsiveScale(250, 400),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
  },
  whiteUsernameCaption: {
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-Regular",
    color: Colors.dark.dark,
    marginBottom: responsiveMargin(16),
    textAlign: "center",
  },
  whiteUnblockButton: {
    marginTop: responsiveScale(24),
    height: responsiveScale(50),
    paddingVertical: responsivePadding(12, 8),
    backgroundColor: Colors.light.yellowish,
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    width: "95%",
    alignSelf: "center",
  },
  aboutHairRow: {
    flexDirection: "row",
    marginTop: responsiveScale(8),
  },
  aboutHairHeader: {
    fontSize: responsiveFontSize(20, 16),
    marginTop: responsiveScale(35),
    fontFamily: "Inter-SemiBold",
    marginBottom: responsiveScale(10),
    textAlign: "left",
    marginRight: scalePercent(10),
    width: scalePercent(40),
  },
  dropDownContainers: {
    backgroundColor: Colors.dark.light,
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    borderRadius: responsiveBorderRadius(20, 10),
    height: responsiveScale(50, 50),
    width: scalePercent(35),
    marginTop: responsiveScale(20, 30),
  },
  aboutHairText: {
    textAlign: "center",
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-Regular",
    width: scalePercent(22),
    marginTop: responsiveScale(12),
  },
  addClientPill: {
    alignSelf: "center",
    paddingVertical: responsiveScale(12),
    paddingHorizontal: responsiveScale(28),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
    minWidth: responsiveScale(200),
    alignItems: "center",
    justifyContent: "center",
  },
  addClientPillLabel: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
  },
  mintButtonWrap: {
    marginTop: responsiveMargin(8),
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  unblockMint: {
    borderWidth: responsiveScale(2),
    backgroundColor: "transparent",
    width: "95%",
    alignSelf: "center",
  },
});
