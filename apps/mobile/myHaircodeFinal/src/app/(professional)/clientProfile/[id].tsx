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
import { DotsThree } from "phosphor-react-native";
import { useLocalSearchParams } from "expo-router";
import { useClientSearch, requestClientLink } from "@/src/api/profiles";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useEffect, useState } from "react";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  Colors,
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { router } from "expo-router";
import {
  removeRelationship,
  useClientLinkUiStatus,
  clientLinkUiStatusQueryKey,
  type ClientLinkUiStatus,
} from "@/src/api/relationships";
import {
  isBlocked,
  unblockUser,
  UNBLOCK_RELATIONSHIP_RESET_ALERT,
  blockUser,
  reportUserEnhanced,
  REPORT_REASONS,
  type ReportReason,
} from "@/src/api/moderation";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  useModerationDetailCopy,
  reportOtherReasonRowStyle,
} from "@/src/components/moderation/ModerationSheetParts";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import { NavBackRow } from "@/src/components/NavBackRow";
import { ClientLinkRequestSentModal } from "@/src/components/ClientLinkRequestSentModal";
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
import { useI18n } from "@/src/providers/LanguageProvider";
import { reportReasonLabel } from "@/src/i18n/moderationLabels";

const screenHeight = Dimensions.get("window").height;

const UserProfile = () => {
  const { t } = useI18n();
  const moderationDetailCopy = useModerationDetailCopy();
  const params = useLocalSearchParams<{
    id?: string | string[];
    client_id?: string | string[];
    full_name?: string | string[];
    phone_number?: string | string[];
    relationship?: string | string[];
    link_pending?: string | string[];
    price?: string | string[];
  }>();
  const client_id =
    coerceRouteParam(params.id) ?? coerceRouteParam(params.client_id);

  const { data: profileData } = useClientSearch(client_id);

  const invalidClientId = !client_id || !isUuid(client_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        first_name: profileData.firstName ?? profileData.first_name,
        username:
          profileData.username ??
          (profileData as { Username?: string }).Username,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
        phone_number: profileData.phoneNumber ?? profileData.phone_number,
        about_me: profileData.aboutMe ?? profileData.about_me,
      }
    : undefined;

  const { session, profile: myProfile } = useAuth();
  const { activeProfessionCode, storedProfessionReady } =
    useActiveProfessionState(myProfile);
  const [loading, setLoading] = useState(false);
  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const hairdresser_id = session?.user.id;

  const isSelfClientProfile = Boolean(
    hairdresser_id && client_id && String(hairdresser_id) === String(client_id)
  );

  const paramStr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const navFullName = paramStr(params.full_name);
  const navPhone = paramStr(params.phone_number);
  const navLinkPending = paramStr(params.link_pending) === "true";
  const navRelationshipActive = paramStr(params.relationship) === "true";

  const linkStatusQueryEnabled = Boolean(
    storedProfessionReady &&
      activeProfessionCode &&
      hairdresser_id &&
      client_id &&
      isUuid(client_id)
  );

  const initialLinkStatus: ClientLinkUiStatus | undefined = navRelationshipActive
    ? "active"
    : navLinkPending
      ? "pending"
      : undefined;

  const {
    data: linkState,
    isPending: linkStatePending,
    isFetched: linkStateFetched,
  } = useClientLinkUiStatus(hairdresser_id, client_id, activeProfessionCode, {
    enabled: linkStatusQueryEnabled,
    initialStatus: initialLinkStatus,
  });

  const linkStateResolved =
    linkState ??
    (linkStatusQueryEnabled && linkStateFetched ? ("none" as const) : null);

  const isRelated = linkStateResolved === "active";

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
    if (
      linkStateResolved === "pending" ||
      loading ||
      !client_id ||
      !isUuid(client_id) ||
      !hairdresser_id ||
      !activeProfessionCode
    )
      return;
    setLoading(true);
    try {
      await requestClientLink(client_id, activeProfessionCode);
      queryClient.setQueryData(
        clientLinkUiStatusQueryKey(
          String(hairdresser_id),
          client_id,
          activeProfessionCode
        ),
        "pending" satisfies ClientLinkUiStatus
      );
      await queryClient.invalidateQueries({ queryKey: ["clientSearch"] });
      setAlertVisible(true);
    } catch (err) {
      console.error("Error sending client link request:", err);
      Alert.alert(
        t("search.requestFailed"),
        err instanceof Error ? err.message : t("search.couldNotSendRequest")
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
        queryKey: ["latest_visits", hairdresser_id],
      });
      if (hairdresser_id && activeProfessionCode) {
        queryClient.setQueryData(
          clientLinkUiStatusQueryKey(
            String(hairdresser_id),
            cid,
            activeProfessionCode
          ),
          "none" satisfies ClientLinkUiStatus
        );
      }
      setActiveAction(null);
    } catch {
      Alert.alert(t("common.error"), t("moderation.removeRelationshipFailed"));
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
          t("moderation.reportReceived"),
          t("moderation.reportAutoBlocked")
        );
      } else {
        Alert.alert(t("moderation.reportReceived"), t("moderation.reportSuccess"));
      }
      setActiveAction(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "You have already reported this user") {
        Alert.alert(
          t("moderation.alreadyReported"),
          t("moderation.alreadyReportedMessage")
        );
      } else {
        console.error("Error reporting user:", error);
        Alert.alert(t("common.error"), t("moderation.reportUserFailed"));
      }
      setActiveAction(null);
    }
  };

  const modalContent = (
    <View>
      <ModerationSheetHeading
        title={t("moderation.safetyTitle")}
        subtitle={t("moderation.safetySubtitlePro", { brand: BRAND_DISPLAY_NAME })}
      />
      <RapportUserModal
        title={t("moderation.deleteLabel")}
        onPress={() => handleModalOption("Delete")}
      />
      <RapportUserModal
        title={t("common.block")}
        onPress={() => handleModalOption("Block")}
      />
      <RapportUserModal
        title={t("common.report")}
        onPress={() => handleModalOption("Report")}
      />
      <RapportUserModal
        title={t("common.cancel")}
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
              label={t("moderation.removeClientLabel")}
              danger
              onPress={async () => {
                if (client_id) await deleteClient(client_id);
              }}
            />
            <RapportUserModal
              title={t("common.cancel")}
              onPress={() => setActiveAction(null)}
            />
          </>
        )}
        {activeAction === "Block" &&
          ["No reason", "Spam, fake profile", "Inappropriate content"].map(
            (reason, idx) => (
              <ModerationReasonRow
                key={`${reason}-${idx}`}
                label={
                  reason === "No reason"
                    ? t("moderation.noReason")
                    : reason === "Spam, fake profile"
                      ? t("moderation.spamFakeProfile")
                      : t("moderation.inappropriateContent")
                }
                onPress={async () => {
                  if (!client_id || !hairdresser_id) return;
                  await blockUser(
                    hairdresser_id,
                    client_id,
                    reason,
                    queryClient
                  );
                  Alert.alert(
                    t("moderation.accountBlocked"),
                    t("moderation.accountBlockedMessage", {
                      brand: BRAND_DISPLAY_NAME,
                    })
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
              label={reportReasonLabel(t, reason.value)}
              style={
                reason.value === "other" ? reportOtherReasonRowStyle : undefined
              }
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
          {t("profile.invalidClientProfileLink")}
        </Text>
        <NavBackRow
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityLabel={t("common.goBack")}
          hitSlop={12}
        />
      </SafeAreaView>
    );
  }

  if (linkStateResolved === null) {
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
          <NavBackRow
            onPress={() => router.back()}
            style={styles.backRow}
            accessibilityLabel={t("common.goBack")}
            hitSlop={12}
          />

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
              {data?.full_name?.trim() || data?.phone_number || t("common.client")}
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
                  text={t("profile.unblock")}
                  textSize={18}
                  textTabletSize={14}
                  onPress={async () => {
                    await unblockUser(
                      hairdresser_id,
                      String(client_id),
                      queryClient
                    );
                    setIsBlockedUser(false);
                    Alert.alert(
                      UNBLOCK_RELATIONSHIP_RESET_ALERT.title,
                      UNBLOCK_RELATIONSHIP_RESET_ALERT.message
                    );
                  }}
                />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.addClientPill,
                  pressed &&
                    linkStateResolved === "none" &&
                    !loading && { opacity: 0.85 },
                ]}
                onPress={handleAddClient}
                disabled={linkStateResolved === "pending" || loading}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: linkStateResolved === "pending" || loading,
                }}
              >
                {loading || (linkStatePending && linkState == null) ? (
                  <ActivityIndicator color={primaryBlack} />
                ) : (
                  <Text style={styles.addClientPillLabel}>
                    {linkStateResolved === "pending"
                      ? t("profile.requestPending")
                      : t("profile.addClient")}
                  </Text>
                )}
              </Pressable>
            )}
          </ScrollView>

          <ClientLinkRequestSentModal
            visible={alertVisible}
            onClose={() => setAlertVisible(false)}
            clientName={data?.full_name?.trim() || navFullName?.trim() || null}
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
            <View style={styles.whiteBackIcon}>
              <NavBackRow
                onPress={() => router.back()}
                accessibilityLabel={t("common.goBack")}
                hitSlop={12}
              />
            </View>
            {!isBlockedUser && !isSelfClientProfile ? (
              <Pressable
                onPress={toggleModal}
                style={styles.whiteMoreIcon}
                hitSlop={12}
                accessibilityLabel={t("profile.moreOptions")}
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
                  text={t("profile.unblockUser")}
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
                      UNBLOCK_RELATIONSHIP_RESET_ALERT.title,
                      UNBLOCK_RELATIONSHIP_RESET_ALERT.message
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
                  {data?.about_me?.trim() ? (
                    <View style={styles.aboutSection}>
                      <Text style={styles.aboutSectionTitle}>
                        About{" "}
                        {(() => {
                          const first = data?.first_name?.trim();
                          if (first) return first;
                          const full = data?.full_name?.trim() ?? "";
                          if (!full) return "them";
                          const sp = full.indexOf(" ");
                          return sp === -1 ? full : full.slice(0, sp);
                        })()}
                      </Text>
                      <View style={styles.aboutTextBox}>
                        <Text
                          style={[
                            styles.aboutText,
                            { fontSize: responsiveFontSize(16, 14) },
                          ]}
                        >
                          {data.about_me.trim()}
                        </Text>
                      </View>
                    </View>
                  ) : null}
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
          modalHeight={screenHeight * 0.68}
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
    alignSelf: "flex-start",
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsiveMargin(12),
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
  aboutSection: {
    width: "100%",
    marginTop: responsiveScale(8),
    paddingHorizontal: scalePercent(2),
  },
  aboutSectionTitle: {
    fontSize: responsiveFontSize(20, 16),
    marginTop: responsiveScale(20),
    fontFamily: "Inter-SemiBold",
    marginBottom: responsiveScale(10),
    textAlign: "left",
    alignSelf: "flex-start",
  },
  aboutTextBox: {
    backgroundColor: Colors.dark.light,
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    borderRadius: responsiveBorderRadius(20, 10),
    width: "100%",
    padding: responsivePadding(16, 12),
    marginTop: responsiveScale(4),
  },
  aboutText: {
    fontFamily: "Inter-Regular",
    color: Colors.dark.dark,
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
