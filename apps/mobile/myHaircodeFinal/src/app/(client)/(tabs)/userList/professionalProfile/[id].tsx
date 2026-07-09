/* eslint-disable react/react-in-jsx-scope */
import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Alert, Pressable, ActivityIndicator } from "react-native";
import { DotsThree } from "phosphor-react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAddHairdresser, useClientSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { coerceProfessionCode, type ProfessionChoiceCode } from "@/src/constants/professionCodes";
import { Colors, primaryBlack } from "@/src/constants/Colors";
import type { Profile } from "@/src/constants/types";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  useModerationDetailCopy,
  reportOtherReasonRowStyle,
} from "@/src/components/moderation/ModerationSheetParts";
import { useI18n } from "@/src/providers/LanguageProvider";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  blockUser,
  REPORT_REASONS,
  ReportReason,
  reportUserEnhanced,
  unblockUser,
  useViewerBlockedTarget,
} from "@/src/api/moderation";
import { UnblockSuccessModal } from "@/src/components/UnblockSuccessModal";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck, relationshipCheckQueryKey } from "@/src/api/relationships";
import { useRemoveRelationships } from "@/src/api/profiles";
import { responsiveScale } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { PublicProfessionalProfileView } from "@/src/components/PublicProfessionalProfileView";
import { BlockedProfileScreen } from "@/src/components/BlockedProfileScreen";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { reportReasonLabel } from "@/src/i18n/moderationLabels";
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { buildPublicProfessionalProfileFields } from "@/src/lib/publicProfessionalProfileFields";

function normalizeRouteParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

/** Search / map pass `relationship=true` when the link is already active. */
function parseRelationshipRouteParam(
  value: string | string[] | undefined
): boolean | undefined {
  const raw = normalizeRouteParam(value);
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return undefined;
}

const ProfessionalProfileScreen = () => {
  const { t } = useI18n();
  const moderationDetailCopy = useModerationDetailCopy();
  const { id, profession, relationship: relationshipParam } = useLocalSearchParams<{
    id: string | string[];
    profession?: string | string[];
    relationship?: string | string[];
  }>();
  const hairdresser_id = normalizeRouteParam(id);
  const routeProfessionRaw = (() => {
    const raw = normalizeRouteParam(profession);
    return raw?.trim() ? raw.trim() : null;
  })();
  /** Lane from Discover / map — never infer from the pro's other accounts. */
  const relationshipLane = useMemo((): ProfessionChoiceCode | null => {
    if (!routeProfessionRaw) return null;
    return coerceProfessionCode(routeProfessionRaw);
  }, [routeProfessionRaw]);

  const { session, profile } = useAuth();
  const client_id = session?.user.id;

  const queryClient = useQueryClient();

  const { data: profileData, isPending: profilePending } =
    useClientSearch(hairdresser_id);
  const p = profileData as Profile | undefined;

  const displayLane = useMemo((): ProfessionChoiceCode | null => {
    if (relationshipLane) return relationshipLane;
    const codes = p?.profession_codes;
    if (Array.isArray(codes) && codes.length === 1) {
      return coerceProfessionCode(String(codes[0]).trim());
    }
    return null;
  }, [relationshipLane, p?.profession_codes]);

  const data = p
    ? {
        ...buildPublicProfessionalProfileFields(p, displayLane),
        avatar_url: resolveAvatarStoragePath(p, displayLane),
      }
    : undefined;

  const relatedFromRoute = useMemo(
    () => parseRelationshipRouteParam(relationshipParam),
    [relationshipParam]
  );

  const cachedRelationship = useMemo(() => {
    if (!client_id || !hairdresser_id || !relationshipLane) return undefined;
    return queryClient.getQueryData<boolean>(
      relationshipCheckQueryKey(client_id, hairdresser_id, relationshipLane)
    );
  }, [client_id, hairdresser_id, relationshipLane, queryClient]);

  const {
    data: isRelatedFromApi = false,
    isFetched: relFetched,
  } = useRelationshipCheck(client_id ?? undefined, hairdresser_id, relationshipLane, {
    enabled: Boolean(client_id && hairdresser_id && relationshipLane),
  });

  const isRelated =
    linkJustAdded ||
    (relFetched
      ? isRelatedFromApi
      : isRelatedFromApi || relatedFromRoute === true);
  const relationshipStatusLoading =
    !linkJustAdded &&
    !isRelatedFromApi &&
    relatedFromRoute === undefined &&
    cachedRelationship === undefined &&
    !relFetched;
  const removeRelationships = useRemoveRelationships(client_id ?? "");

  const isOwnProfile = Boolean(
    hairdresser_id &&
      ((client_id && client_id === hairdresser_id) ||
        (profile?.id && profile.id === hairdresser_id))
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [linkJustAdded, setLinkJustAdded] = useState(false);
  const [unblockSuccessVisible, setUnblockSuccessVisible] = useState(false);
  const { mutateAsync: addHairdresserDB } = useAddHairdresser(
    hairdresser_id,
    client_id,
    relationshipLane
  );

  const blockLane = relationshipLane ?? displayLane;
  const { isBlocked: isBlockedUser, ready: blockStateReady } =
    useViewerBlockedTarget(client_id, hairdresser_id, blockLane);
  const showRelationshipCta =
    !isOwnProfile && !!relationshipLane && !isRelated && !isBlockedUser;

  const deleteHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    if (!relationshipLane) {
      Alert.alert(
        t("moderation.removeLinkFailed"),
        t("moderation.removeLinkFailedMessage")
      );
      return;
    }
    try {
      await removeRelationships.mutateAsync([
        {
          hairdresserId: hairdresser_id,
          professionCode: relationshipLane,
        },
      ]);
      setActiveAction(null);
      setIsModalVisible(false);
      router.replace("/(client)/(tabs)/home" as Href);
    } catch (error) {
      console.error(error);
      Alert.alert(t("common.error"), t("moderation.removeProfessionalFailed"));
      throw error;
    }
  }, [
    client_id,
    hairdresser_id,
    relationshipLane,
    removeRelationships,
  ]);

  const addHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    if (!relationshipLane) {
      Alert.alert(
        t("moderation.removeLinkFailed"),
        t("moderation.removeLinkFailedMessage")
      );
      return;
    }
    setLoading(true);
    try {
      await addHairdresserDB();

      setLinkJustAdded(true);
      queryClient.setQueryData(
        relationshipCheckQueryKey(client_id, hairdresser_id, relationshipLane),
        true
      );
    } catch (error) {
      console.error("Error adding hairdresser:", error);
      Alert.alert(t("common.error"), t("moderation.addProfessionalFailed"));
    } finally {
      setLoading(false);
    }
  }, [addHairdresserDB, hairdresser_id, client_id, profile, queryClient, relationshipLane, t]);

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const handleUnblock = async () => {
    if (!client_id || !hairdresser_id || !blockLane) return;
    try {
      await unblockUser(client_id, hairdresser_id, blockLane, queryClient);
      setUnblockSuccessVisible(true);
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert(t("common.error"), t("moderation.unblockUserFailed"));
    }
  };

  const handleBlock = async (reason: string) => {
    if (!client_id || !hairdresser_id || !blockLane) return;
    try {
      await blockUser(
        client_id,
        hairdresser_id,
        reason,
        blockLane,
        queryClient as unknown as {
          invalidateQueries: (opts: unknown) => void;
        }
      );
      Alert.alert(
        t("moderation.accountBlocked"),
        t("moderation.accountBlockedMessage", { brand: BRAND_DISPLAY_NAME })
      );
      setActiveAction(null);
    } catch (error) {
      console.error("Error blocking user:", error);
      Alert.alert(t("common.error"), t("moderation.blockUserFailed"));
    }
  };

  const handleReport = async (reason: ReportReason) => {
    if (!client_id || !hairdresser_id) return;
    try {
      const result = await reportUserEnhanced(
        client_id,
        hairdresser_id,
        reason,
        undefined,
        queryClient as unknown as {
          invalidateQueries: (opts: unknown) => void;
        }
      );

      const autoBlocked =
        "autoBlocked" in result &&
        Boolean((result as { autoBlocked?: boolean }).autoBlocked);
      if (autoBlocked) {
        Alert.alert(
          t("moderation.reportReceived"),
          t("moderation.reportAutoBlocked")
        );
      } else {
        Alert.alert(t("moderation.reportReceived"), t("moderation.reportSuccess"));
      }

      setActiveAction(null);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "You have already reported this user"
      ) {
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

  const moderationPrimaryContent = (
    <View>
      <ModerationSheetHeading
        title={t("moderation.safetyTitle")}
        subtitle={t("moderation.safetySubtitleClient", { brand: BRAND_DISPLAY_NAME })}
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
              label={t("moderation.removeProfessional")}
              danger
              disabled={removeRelationships.isPending}
              onPress={() => void deleteHairdresser().catch(() => {})}
            />
            <ModerationReasonRow
              label={t("common.notNow")}
              disabled={removeRelationships.isPending}
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
                onPress={() => handleBlock(reason)}
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

  /** Wait for profile + blocked-list before painting Add vs blocked (avoids flash). */
  const showRouteLoading =
    (profilePending && p === undefined) ||
    (Boolean(client_id && blockLane) && !blockStateReady);
  if (showRouteLoading) {
    return <ThemedRouteLoading accessibilityLabel={t("profile.loadingProfile")} />;
  }

  if (isBlockedUser) {
    return (
      <>
        <BlockedProfileScreen onUnblock={handleUnblock} />
        <UnblockSuccessModal
          visible={unblockSuccessVisible}
          onClose={() => setUnblockSuccessVisible(false)}
        />
      </>
    );
  }

  if (!data || !hairdresser_id) return null;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <PublicProfessionalProfileView
        mode="client"
        profileUserId={String(hairdresser_id)}
        fullName={data.full_name}
        firstName={data.first_name ?? null}
        username={data.username ?? null}
        avatarUrl={data.avatar_url ?? null}
        salonName={data.salon_name ?? null}
        businessAddress={data.business_address ?? null}
        aboutMe={data.about_me ?? null}
        salonPhone={data.salon_phone_number ?? null}
        hasActiveSubscription={Boolean(p?.has_active_subscription)}
        bookingSite={data.booking_site ?? null}
        socialMediaRaw={data.social_media ?? null}
        colorBrandRaw={data.color_brand ?? null}
        hideColorBrand
        professionCodes={
          Array.isArray(data.profession_codes) ? data.profession_codes : null
        }
        activeProfessionCode={relationshipLane ?? displayLane}
        viewerProfessionCodes={profile?.profession_codes}
        onBack={() => router.back()}
        showRelationshipCta={showRelationshipCta}
        isRelated={isRelated}
        relationshipStatusLoading={relationshipStatusLoading}
        addLoading={loading}
        onAddHairdresser={addHairdresser}
        headerRight={
          isOwnProfile ? undefined : (
            <Pressable onPress={() => setIsModalVisible(true)} hitSlop={12}>
              <DotsThree size={32} color={primaryBlack} weight="bold" />
            </Pressable>
          )
        }
        analyticsProfessionCode={displayLane}
      />
      <SmallDraggableModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onModalHide={() => {
          if (pendingAction) {
            setActiveAction(pendingAction);
            setPendingAction(null);
          }
        }}
        modalHeight="68%"
        sheetVariant="brand"
        renderContent={moderationPrimaryContent}
      />
      {activeAction ? (
        <SmallDraggableModal
          isVisible
          onClose={() => setActiveAction(null)}
          modalHeight="72%"
          sheetVariant="brand"
          renderContent={renderModerationDetail()}
        />
      ) : null}
      {removeRelationships.isPending ? (
        <View
          style={styles.removingOverlay}
          pointerEvents="auto"
          accessibilityLabel={t("profile.removingProfessional")}
        >
          <ActivityIndicator size="large" color={primaryBlack} />
        </View>
      ) : null}
    </View>
  );
};

export default ProfessionalProfileScreen;

const styles = StyleSheet.create({
  removingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(241, 249, 244, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
});
