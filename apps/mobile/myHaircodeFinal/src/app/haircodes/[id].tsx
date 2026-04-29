import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretRight, Plus, Eye, DotsThree } from "phosphor-react-native";
import { ViewGalleryRowIcon } from "@/src/components/ViewGalleryRowIcon";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  moderationDetailCopy,
} from "@/src/components/moderation/ModerationSheetParts";
import { router, useLocalSearchParams } from "expo-router";
import MyButton from "@/src/components/MyButton";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useClientSearch } from "@/src/api/profiles";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  MintBrandModal,
  MintBrandModalFooterRow,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import {
  blockUser,
  isBlocked,
  reportUserEnhanced,
  REPORT_REASONS,
  type ReportReason,
  UNBLOCK_RELATIONSHIP_RESET_ALERT,
  unblockUser,
} from "@/src/api/moderation";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck, removeRelationship } from "@/src/api/relationships";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { MintFullScreenSpinner } from "@/src/components/MintSpinningWheel";
import { NavBackRow, navBackChromeBarCombined } from "@/src/components/NavBackRow";

const screenHeight = Dimensions.get("window").height;

function firstRouteParam(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const HaircodeList = () => {
  const {
    id: client_id,
    phone_number,
    full_name,
    relationship,
    price,
    professionCode: professionCodeParam,
    profession_code: professionCodeSnakeParam,
  } = useLocalSearchParams<{
    professionCode?: string | string[];
    profession_code?: string | string[];
  }>();

  const { data: profileData } = useClientSearch(client_id);
  const data = profileData
    ? {
        full_name: profileData.fullName ?? profileData.full_name,
        username:
          profileData.username ??
          (profileData as { Username?: string }).Username,
        avatar_url: profileData.avatarUrl ?? profileData.avatar_url,
        phone_number:
          profileData.phoneNumber ?? profileData.phone_number,
      }
    : undefined;
  const { session, profile } = useAuth();
  const hairdresser_id = session?.user.id;

  const normalizedProfileProfessionCodes = useMemo((): ProfessionChoiceCode[] => {
    const out: ProfessionChoiceCode[] = [];
    const codes =
      profile?.profession_codes ??
      (profile as { professionCodes?: string[] | null } | null)?.professionCodes;
    for (const c of codes ?? []) {
      const n = coerceProfessionCode(c);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  }, [profile]);

  const routeProfessionFromUrl = useMemo(() => {
    const raw =
      firstRouteParam(professionCodeParam) ??
      firstRouteParam(professionCodeSnakeParam);
    return coerceProfessionCode(raw ?? undefined);
  }, [professionCodeParam, professionCodeSnakeParam]);

  const {
    activeProfessionCode: storageLaneProfessionCode,
    storedProfessionReady,
  } = useActiveProfessionState(profile);

  const routeLaneMatchesProfile =
    Boolean(routeProfessionFromUrl) &&
    (normalizedProfileProfessionCodes.length === 0 ||
      normalizedProfileProfessionCodes.includes(routeProfessionFromUrl));

  /** Same lane resolution as `(hairdresser)/home` — avoids stale hair fallback from `useResolvedListProfessionCode`. */
  const navProfessionCode = useMemo((): ProfessionChoiceCode | null => {
    if (routeLaneMatchesProfile && routeProfessionFromUrl)
      return routeProfessionFromUrl;
    return storageLaneProfessionCode;
  }, [
    routeLaneMatchesProfile,
    routeProfessionFromUrl,
    storageLaneProfessionCode,
  ]);

  const navProfessionReady =
    Boolean(navProfessionCode) &&
    (storedProfessionReady || routeLaneMatchesProfile);

  const queryClient = useQueryClient();
  const relationshipQueryEnabled = Boolean(
    client_id &&
      hairdresser_id &&
      navProfessionReady &&
      navProfessionCode
  );
  const { data: isRelated = false, isFetching: relLoading } =
    useRelationshipCheck(
      client_id as string,
      hairdresser_id ?? undefined,
      navProfessionCode,
      { enabled: relationshipQueryEnabled }
    );

  const normalizedPhoneNumber = Array.isArray(phone_number)
    ? phone_number[0]
    : phone_number;
  const navFullName = Array.isArray(full_name) ? full_name[0] : full_name;
  const navRelationship = Array.isArray(relationship)
    ? relationship[0]
    : relationship;
  const navPrice = Array.isArray(price) ? price[0] : price;

  const displayUsername =
    typeof data?.username === "string" && data.username.trim()
      ? data.username.trim()
      : null;
  const displayFullName =
    data?.full_name?.trim() ||
    navFullName?.trim() ||
    data?.phone_number?.trim() ||
    normalizedPhoneNumber?.trim() ||
    "Client";
  const relParam = navRelationship ?? "true";

  const connectedAvatarSize = responsiveScale(120, 144);

  // Control modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [isBlockedUser, setIsBlockedUser] = useState(false);

  const displayPhonePill = isBlockedUser
    ? null
    : data?.phone_number?.trim() ||
      normalizedPhoneNumber?.trim() ||
      null;

  // Handlers
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const deleteClient = async (clientId: string) => {
    try {
      await removeRelationship(
        hairdresser_id,
        clientId,
        navProfessionCode
      );
      queryClient.invalidateQueries({
        queryKey: ["listAllClientSearch", hairdresser_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["latest_haircodes", hairdresser_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["client_haircodes", clientId],
      });
      await queryClient.refetchQueries({
        queryKey: ["latest_haircodes", hairdresser_id],
      });
      router.replace({ pathname: `/(hairdresser)/clientProfile/${clientId}` });
    } catch (error) {
      Alert.alert("Error", "Failed to delete user.");
    }
  };

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  useEffect(() => {
    const checkBlocked = async () => {
      if (client_id && hairdresser_id) {
        const blocked = await isBlocked(hairdresser_id, client_id);
        setIsBlockedUser(blocked);
      }
    };
    checkBlocked();
  }, [client_id, hairdresser_id]);

  const handleReport = async (reason: ReportReason) => {
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

  const modalContent = (
    <View>
      <ModerationSheetHeading
        title="Safety & privacy"
        subtitle={`Manage how you interact with this client on ${BRAND_DISPLAY_NAME}.`}
      />
      {isRelated && (
        <RapportUserModal
          title="Delete"
          onPress={() => handleModalOption("Delete")}
        />
      )}
      <RapportUserModal
        title="Block"
        onPress={() => handleModalOption("Block")}
      />
      <RapportUserModal
        title="Report"
        onPress={() => handleModalOption("Report")}
      />
      <RapportUserModal
        title="Cancel"
        onPress={() => setIsModalVisible(false)}
      />
    </View>
  );

  const moderationStepCopy =
    activeAction === "Delete"
      ? moderationDetailCopy.removeClient
      : activeAction === "Block"
        ? moderationDetailCopy.block
        : activeAction === "Report"
          ? moderationDetailCopy.report
          : null;

  if (relLoading) {
    return <MintFullScreenSpinner />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.mintRoot} edges={["top", "left", "right"]}>
        <View style={navBackChromeBarCombined()}>
          <NavBackRow
            layout="inlineBar"
            onPress={() => router.back()}
            hitSlop={12}
          />
          {!isBlockedUser ? (
            <Pressable
              onPress={toggleModal}
              style={styles.connectedMore}
              hitSlop={12}
              accessibilityLabel="More options"
            >
              <DotsThree
                size={responsiveScale(28)}
                color={primaryBlack}
                weight="bold"
              />
            </Pressable>
          ) : (
            <View style={styles.connectedMoreSpacer} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.connectedScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.avatarOuter,
              {
                width: connectedAvatarSize,
                height: connectedAvatarSize,
                borderRadius: connectedAvatarSize / 2,
              },
            ]}
          >
            <AvatarWithSpinner
              uri={data?.avatar_url}
              size={connectedAvatarSize}
              style={{
                width: connectedAvatarSize,
                height: connectedAvatarSize,
                borderRadius: connectedAvatarSize / 2,
              }}
            />
          </View>

          <Text
            style={[Typography.h3, styles.nameMint]}
            accessibilityRole="header"
          >
            {displayFullName}
          </Text>
          {displayUsername ? (
            <Text
              style={[
                Typography.anton26,
                styles.usernameMint,
                styles.usernameMintConnected,
              ]}
            >
              {displayUsername}
            </Text>
          ) : null}

          {displayPhonePill ? (
            <View style={styles.phonePill}>
              <Text style={styles.phonePillLabel}>{displayPhonePill}</Text>
            </View>
          ) : null}

          {isBlockedUser ? (
            <View style={styles.mintButtonWrap}>
              <MyButton
                style={[styles.unblockMint, { borderColor: "red" }]}
                text="Unblock User"
                textSize={18}
                textTabletSize={14}
                onPress={async () => {
                  await unblockUser(hairdresser_id, client_id, queryClient);
                  setIsBlockedUser(false);
                  Alert.alert(
                    UNBLOCK_RELATIONSHIP_RESET_ALERT.title,
                    UNBLOCK_RELATIONSHIP_RESET_ALERT.message
                  );
                }}
              />
            </View>
          ) : (
            <View style={styles.actionCard}>
              <View style={styles.actionRowShellFirst}>
                <Pressable
                  disabled={!navProfessionReady}
                  style={({ pressed }) => [
                    styles.actionRowInner,
                    pressed && styles.actionRowPressed,
                    !navProfessionReady && { opacity: 0.45 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/new_haircode",
                      params: {
                        clientId: client_id as string,
                        ...(navProfessionReady && navProfessionCode
                          ? { professionCode: navProfessionCode }
                          : {}),
                      },
                    })
                  }
                >
                  <View style={styles.actionRowLeft}>
                    <Plus size={responsiveScale(28)} color={primaryBlack} />
                    <Text style={styles.actionRowTitle}>New visit</Text>
                  </View>
                  <CaretRight size={responsiveScale(24)} color={primaryBlack} />
                </Pressable>
              </View>
              <View style={styles.actionRowShellMiddle}>
                <Pressable
                  disabled={!navProfessionReady}
                  style={({ pressed }) => [
                    styles.actionRowInner,
                    pressed && styles.actionRowPressed,
                    !navProfessionReady && { opacity: 0.45 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/see_haircode",
                      params: {
                        id: client_id,
                        phone_number:
                          displayPhonePill ?? normalizedPhoneNumber ?? "",
                        full_name: displayFullName,
                        relationship: relParam,
                        price: navPrice ?? "",
                        professionCode: navProfessionCode,
                      },
                    })
                  }
                >
                  <View style={styles.actionRowLeft}>
                    <Eye size={responsiveScale(28)} color={primaryBlack} />
                    <Text style={styles.actionRowTitle}>View all visits</Text>
                  </View>
                  <CaretRight size={responsiveScale(24)} color={primaryBlack} />
                </Pressable>
              </View>
              <View style={styles.actionRowShellLast}>
                <Pressable
                  disabled={!navProfessionReady}
                  style={({ pressed }) => [
                    styles.actionRowInner,
                    pressed && styles.actionRowPressed,
                    !navProfessionReady && { opacity: 0.45 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/haircodes/view_gallery",
                      params: {
                        clientId: client_id,
                        clientName: displayFullName,
                        professionCode: navProfessionCode,
                      },
                    })
                  }
                >
                  <View style={styles.actionRowLeft}>
                    <ViewGalleryRowIcon
                      size={responsiveScale(28)}
                      color={primaryBlack}
                    />
                    <Text style={styles.actionRowTitle}>View gallery</Text>
                  </View>
                  <CaretRight size={responsiveScale(24)} color={primaryBlack} />
                </Pressable>
              </View>
            </View>
          )}
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
          modalHeight={screenHeight * 0.58}
          sheetVariant="brand"
          renderContent={modalContent}
        />

        <MintBrandModal
          visible={moderationStepCopy != null}
          onClose={() => setActiveAction(null)}
          title={moderationStepCopy?.title ?? ""}
          message={
            moderationStepCopy ? (
              <View style={styles.mintModerationMessage}>
                <Text
                  style={[Typography.bodySmall, styles.mintModerationSubtitle]}
                >
                  {moderationStepCopy.subtitle}
                </Text>
                <View style={styles.mintModerationRows}>
                  {activeAction === "Delete" && (
                    <>
                      <ModerationReasonRow
                        label="Remove client"
                        danger
                        onPress={async () => {
                          await deleteClient(client_id);
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
                    ["No reason", "Spam, fake profile", "Inappropriate content"].map(
                      (reason, idx) => (
                        <ModerationReasonRow
                          key={`${reason}-${idx}`}
                          label={reason}
                          onPress={async () => {
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
              </View>
            ) : null
          }
          footer={
            moderationStepCopy ? (
              <MintBrandModalFooterRow>
                <MintBrandModalSecondaryButton
                  label="Cancel"
                  onPress={() => setActiveAction(null)}
                />
              </MintBrandModalFooterRow>
            ) : null
          }
        />
      </SafeAreaView>
    </>
  );
};

export default HaircodeList;

const styles = StyleSheet.create({
  mintRoot: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  connectedMore: {
    padding: responsivePadding(8),
    minWidth: responsiveScale(44),
    alignItems: "flex-end",
  },
  connectedMoreSpacer: {
    width: responsiveScale(44),
  },
  connectedScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
    paddingBottom: responsiveMargin(40),
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
  usernameMintConnected: {
    marginBottom: responsiveMargin(12),
  },
  phonePill: {
    alignSelf: "center",
    paddingVertical: responsiveScale(10),
    paddingHorizontal: responsiveScale(22),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
    marginBottom: responsiveMargin(52),
  },
  phonePillLabel: {
    ...Typography.outfitRegular16,
    fontWeight: "400",
    textAlign: "center",
  },
  actionCard: {
    width: "100%",
    maxWidth: 400,
    gap: responsiveMargin(6),
    backgroundColor: "transparent",
  },
  /** Mint shows in gaps; only stack outer top/bottom get radius (per design). */
  actionRowShellFirst: {
    borderTopLeftRadius: responsiveScale(22),
    borderTopRightRadius: responsiveScale(22),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}22`,
    backgroundColor: primaryWhite,
  },
  actionRowShellMiddle: {
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}22`,
    backgroundColor: primaryWhite,
  },
  actionRowShellLast: {
    borderBottomLeftRadius: responsiveScale(22),
    borderBottomRightRadius: responsiveScale(22),
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}22`,
    backgroundColor: primaryWhite,
  },
  actionRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsivePadding(22, 20),
    paddingHorizontal: responsivePadding(22, 20),
    minHeight: responsiveScale(64, 58),
    backgroundColor: primaryWhite,
  },
  actionRowPressed: {
    backgroundColor: `${primaryBlack}08`,
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(18),
  },
  actionRowTitle: {
    ...Typography.bodyLarge,
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
  mintModerationMessage: {
    alignSelf: "stretch",
    width: "100%",
  },
  mintModerationSubtitle: {
    textAlign: "center",
    opacity: 0.72,
    marginBottom: responsiveMargin(16),
    lineHeight: responsiveScale(22),
  },
  mintModerationRows: {
    alignSelf: "stretch",
    width: "100%",
  },
});