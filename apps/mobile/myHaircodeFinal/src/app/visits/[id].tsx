import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretRight, Plus, Eye, DotsThree } from "phosphor-react-native";
import { ViewGalleryRowIcon } from "@/src/components/ViewGalleryRowIcon";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  useModerationDetailCopy,
} from "@/src/components/moderation/ModerationSheetParts";
import { ReportReasonPicker } from "@/src/components/moderation/ReportReasonPicker";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { BlockedInlineNotice } from "@/src/components/BlockedProfileScreen";
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
  unblockUser,
  useViewerBlockedTarget,
  useBlockedBySender,
} from "@/src/api/moderation";
import { UnblockSuccessModal } from "@/src/components/UnblockSuccessModal";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck, removeRelationship } from "@/src/api/relationships";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { MintFullScreenSpinner } from "@/src/components/MintSpinningWheel";
import { NavBackRow, navBackChromeBarCombined } from "@/src/components/NavBackRow";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useVisitLimitGate } from "@/src/hooks/useVisitLimitGate";
import { formatPhoneForDisplay } from "@/src/lib/profileFieldValidation";

const screenHeight = Dimensions.get("window").height;

function firstRouteParam(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const VisitList = () => {
  const { t } = useI18n();
  const { guard: guardCreateVisit } = useVisitLimitGate("create");
  const { guard: guardViewVisits } = useVisitLimitGate("view");
  const moderationDetailCopy = useModerationDetailCopy();
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

  /** Same lane resolution as `(professional)/home` — avoids stale hair fallback from `useResolvedListProfessionCode`. */
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
  const {
    data: isRelated = false,
    isFetching: relLoading,
    isFetched: relFetched,
  } = useRelationshipCheck(
    client_id as string,
    hairdresser_id ?? undefined,
    navProfessionCode,
    { enabled: relationshipQueryEnabled }
  );
  const relReady = !relationshipQueryEnabled || relFetched;

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
    formatPhoneForDisplay(data?.phone_number) ||
    formatPhoneForDisplay(normalizedPhoneNumber) ||
    t("common.client");
  const relParam = navRelationship ?? "true";

  const connectedAvatarSize = responsiveScale(120, 144);

  const { width: winW, height: winH } = useWindowDimensions();
  const mintContentMaxW = useMemo(() => {
    const shortSide = Math.min(winW, winH);
    const hPad = responsivePadding(24) * 2;
    if (!isTablet()) return 400;
    return Math.min(contentCardMaxWidth(shortSide), winW - hPad);
  }, [winW, winH]);

  // Control modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [unblockSuccessVisible, setUnblockSuccessVisible] = useState(false);

  const { isBlocked: isBlockedUser, ready: blockStateReady } =
    useViewerBlockedTarget(
      hairdresser_id,
      typeof client_id === "string" ? client_id : undefined,
      navProfessionCode
    );
  const { isBlockedBySender: isBlockedByClient, ready: blockedByReady } =
    useBlockedBySender(
      hairdresser_id,
      typeof client_id === "string" ? client_id : undefined,
      navProfessionCode
    );
  const profileUnavailable =
    isBlockedUser || isBlockedByClient;

  const shouldUseClientAddProfile =
    relationshipQueryEnabled && !profileUnavailable && !isRelated;

  useEffect(() => {
    if (!shouldUseClientAddProfile) return;
    const cid =
      typeof client_id === "string"
        ? client_id
        : Array.isArray(client_id)
          ? client_id[0]
          : undefined;
    if (!cid) return;
    router.replace({
      pathname: "/(professional)/clientProfile/[id]" as Href,
      params: {
        id: cid,
        client_id: cid,
        full_name: displayFullName,
        relationship: "false",
        ...(navProfessionCode ? { professionCode: navProfessionCode } : {}),
      },
    });
  }, [
    shouldUseClientAddProfile,
    client_id,
    displayFullName,
    navProfessionCode,
  ]);

  /** Pro must not open Safety & privacy against their own client profile. */
  const isSelfClientProfile = Boolean(
    hairdresser_id &&
      client_id &&
      String(hairdresser_id) === String(client_id)
  );

  const rawPhoneNumber =
    data?.phone_number?.trim() || normalizedPhoneNumber?.trim() || "";

  const displayPhonePill = profileUnavailable
    ? null
    : rawPhoneNumber
      ? formatPhoneForDisplay(rawPhoneNumber)
      : null;

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
        queryKey: ["latest_visits", hairdresser_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["client_visits", clientId],
      });
      await queryClient.refetchQueries({
        queryKey: ["latest_visits", hairdresser_id],
      });
      router.replace({ pathname: `/(professional)/clientProfile/${clientId}` });
    } catch (error) {
      Alert.alert(t("common.error"), t("profile.failedDeleteUser"));
    }
  };

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const modalContent = (
    <View>
      <ModerationSheetHeading
        title={t("moderation.safetyTitle")}
        subtitle={t("moderation.safetySubtitlePro", { brand: BRAND_DISPLAY_NAME })}
      />
      {isRelated && (
        <RapportUserModal
          title={t("moderation.deleteLabel")}
          onPress={() => handleModalOption("Delete")}
        />
      )}
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

  const moderationStepCopy =
    activeAction === "Delete"
      ? moderationDetailCopy.removeClient
      : activeAction === "Block"
        ? moderationDetailCopy.block
        : activeAction === "Report"
          ? moderationDetailCopy.report
          : null;

  if (
    relLoading ||
    !relReady ||
    !navProfessionReady ||
    !blockStateReady ||
    !blockedByReady ||
    shouldUseClientAddProfile
  ) {
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
          {!profileUnavailable && !isSelfClientProfile ? (
            <Pressable
              onPress={toggleModal}
              style={styles.connectedMore}
              hitSlop={12}
              accessibilityLabel={t("profile.moreOptions")}
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
          {!isBlockedByClient ? (
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
          ) : null}

          <Text
            style={[Typography.h3, styles.nameMint]}
            accessibilityRole="header"
          >
            {displayFullName}
          </Text>
          {displayUsername && !isBlockedByClient ? (
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

          {isBlockedByClient ? (
            <Text style={[Typography.bodyMedium, styles.blockedByHint]}>
              {t("notifications.profileUnavailableBlocked")}
            </Text>
          ) : isBlockedUser ? (
            <BlockedInlineNotice
              style={{ maxWidth: mintContentMaxW }}
              onUnblock={async () => {
                if (!hairdresser_id || !client_id || !navProfessionCode) return;
                await unblockUser(
                  hairdresser_id,
                  client_id,
                  navProfessionCode,
                  queryClient
                );
                setUnblockSuccessVisible(true);
              }}
            />
          ) : (
            <View style={[styles.actionCard, { maxWidth: mintContentMaxW }]}>
              <View style={styles.actionRowShellFirst}>
                <Pressable
                  disabled={!navProfessionReady}
                  style={({ pressed }) => [
                    styles.actionRowInner,
                    pressed && styles.actionRowPressed,
                    !navProfessionReady && { opacity: 0.45 },
                  ]}
                  onPress={() => {
                    if (!guardCreateVisit()) return;
                    router.push({
                      pathname: "/visits/new_visit",
                      params: {
                        clientId: client_id as string,
                        ...(navProfessionReady && navProfessionCode
                          ? { professionCode: navProfessionCode }
                          : {}),
                      },
                    });
                  }}
                >
                  <View style={styles.actionRowLeft}>
                    <Plus size={responsiveScale(28)} color={primaryBlack} />
                    <Text style={styles.actionRowTitle}>{t("visits.newVisit")}</Text>
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
                  onPress={() => {
                    if (!guardViewVisits()) return;
                    router.push({
                      pathname: "/visits/see_visits",
                      params: {
                        id: client_id,
                        phone_number: rawPhoneNumber,
                        full_name: displayFullName,
                        relationship: relParam,
                        price: navPrice ?? "",
                        professionCode: navProfessionCode,
                      },
                    });
                  }}
                >
                  <View style={styles.actionRowLeft}>
                    <Eye size={responsiveScale(28)} color={primaryBlack} />
                    <Text style={styles.actionRowTitle}>{t("visits.viewAll")}</Text>
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
                  onPress={() => {
                    if (!guardViewVisits()) return;
                    router.push({
                      pathname: "/visits/view_gallery",
                      params: {
                        clientId: client_id,
                        clientName: displayFullName,
                        professionCode: navProfessionCode,
                      },
                    });
                  }}
                >
                  <View style={styles.actionRowLeft}>
                    <ViewGalleryRowIcon
                      size={responsiveScale(28)}
                      color={primaryBlack}
                    />
                    <Text style={styles.actionRowTitle}>{t("visits.viewGallery")}</Text>
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
          modalHeight={screenHeight * 0.68}
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
                    <ModerationReasonRow
                      label={t("moderation.removeClientLabel")}
                      danger
                      onPress={async () => {
                        await deleteClient(client_id);
                        setActiveAction(null);
                      }}
                    />
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
                            if (!navProfessionCode) return;
                            await blockUser(
                              hairdresser_id,
                              client_id,
                              reason,
                              navProfessionCode,
                              queryClient
                            );
                            Alert.alert(
                              t("moderation.accountBlocked"),
                              t("moderation.accountBlockedMessage", {
                                brand: BRAND_DISPLAY_NAME,
                              })
                            );
                            setActiveAction(null);
                          }}
                        />
                      )
                    )}
                  {activeAction === "Report" &&
                    hairdresser_id &&
                    client_id &&
                    navProfessionCode ? (
                      <ReportReasonPicker
                        reporterId={hairdresser_id}
                        reportedId={String(client_id)}
                        professionCode={navProfessionCode}
                        context="pro_client_hub"
                        onDone={() => setActiveAction(null)}
                      />
                    ) : null}
                </View>
              </View>
            ) : null
          }
          footer={
            moderationStepCopy ? (
              <MintBrandModalFooterRow>
                <MintBrandModalSecondaryButton
                  label={t("common.cancel")}
                  onPress={() => setActiveAction(null)}
                />
              </MintBrandModalFooterRow>
            ) : null
          }
        />
        <UnblockSuccessModal
          visible={unblockSuccessVisible}
          onClose={() => setUnblockSuccessVisible(false)}
        />
      </SafeAreaView>
    </>
  );
};

export default VisitList;

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
  blockedByHint: {
    textAlign: "center",
    marginTop: responsiveMargin(20),
    maxWidth: 360,
    color: primaryBlack,
    opacity: 0.72,
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