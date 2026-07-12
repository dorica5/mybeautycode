import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Alert, Pressable, Text, ActivityIndicator } from "react-native";
import { DotsThree } from "phosphor-react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAddHairdresser, useClientSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { Colors, primaryBlack, primaryGreen } from "@/src/constants/Colors";
import type { Profile } from "@/src/constants/types";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  useModerationDetailCopy,
} from "@/src/components/moderation/ModerationSheetParts";
import { ReportReasonPicker } from "@/src/components/moderation/ReportReasonPicker";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  blockUser,
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
import { isUuid } from "@/src/utils/isUuid";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { resolveAvatarStoragePath } from "@/src/lib/resolveAvatarStoragePath";
import { buildPublicProfessionalProfileFields } from "@/src/lib/publicProfessionalProfileFields";
import { useI18n } from "@/src/providers/LanguageProvider";

/**
 * Same public profile UI as `(client)/(tabs)/userList/professionalProfile/[id]` and
 * `(professional)/(tabs)/profile/professional_profile`, opened from visits.
 */
const OtherProfessionalProfileScreen = () => {
  const { t } = useI18n();
  const moderationDetailCopy = useModerationDetailCopy();
  const raw = useLocalSearchParams<{
    hairdresser_id?: string | string[];
    profession_code?: string | string[];
  }>();
  const hairdresser_id = Array.isArray(raw.hairdresser_id)
    ? raw.hairdresser_id[0]
    : raw.hairdresser_id;

  const professionCodeFromVisit = useMemo((): ProfessionChoiceCode | null => {
    const v = Array.isArray(raw.profession_code)
      ? raw.profession_code[0]
      : raw.profession_code;
    if (typeof v !== "string" || !v.trim()) return null;
    return coerceProfessionCode(v);
  }, [raw.profession_code]);

  const { session, profile } = useAuth();
  const client_id = session?.user.id;

  const queryClient = useQueryClient();

  const { data: profileData, isLoading: profileLoading } = useClientSearch(
    hairdresser_id
  );
  const p = profileData as Profile | undefined;

  const data = p
    ? {
        ...buildPublicProfessionalProfileFields(p, professionCodeFromVisit),
        avatar_url: resolveAvatarStoragePath(p, professionCodeFromVisit),
      }
    : undefined;

  const { data: isRelatedFromApi = false, isFetched: relFetched } =
    useRelationshipCheck(
      client_id ?? undefined,
      hairdresser_id,
      professionCodeFromVisit
    );
  const [linkJustAdded, setLinkJustAdded] = useState(false);
  const isRelated = linkJustAdded || isRelatedFromApi;
  const relationshipStatusLoading =
    !linkJustAdded && !isRelatedFromApi && !relFetched;
  const removeRelationships = useRemoveRelationships(client_id ?? "");

  const [unblockSuccessVisible, setUnblockSuccessVisible] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const { mutateAsync: addHairdresserDB } = useAddHairdresser(
    hairdresser_id,
    client_id,
    professionCodeFromVisit
  );

  const { isBlocked: isBlockedUser, ready: blockStateReady } =
    useViewerBlockedTarget(client_id, hairdresser_id, professionCodeFromVisit);

  const showRelationshipCta = Boolean(
    profile?.user_type === "CLIENT" &&
      profile?.id &&
      hairdresser_id &&
      professionCodeFromVisit &&
      profile.id !== hairdresser_id &&
      !isRelated &&
      !isBlockedUser
  );

  const isViewingOwnProfile = Boolean(
    profile?.id && hairdresser_id && profile.id === hairdresser_id
  );

  const deleteHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    if (!professionCodeFromVisit) {
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
          professionCode: professionCodeFromVisit,
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
    professionCodeFromVisit,
    removeRelationships,
  ]);

  const addHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id || !professionCodeFromVisit) return;
    setLoading(true);
    try {
      await addHairdresserDB();

      setLinkJustAdded(true);
      queryClient.setQueryData(
        relationshipCheckQueryKey(
          client_id,
          hairdresser_id,
          professionCodeFromVisit
        ),
        true
      );
    } catch (error) {
      console.error("Error adding hairdresser:", error);
      Alert.alert(t("common.error"), t("moderation.addProfessionalFailed"));
    } finally {
      setLoading(false);
    }
  }, [addHairdresserDB, hairdresser_id, client_id, profile, queryClient, professionCodeFromVisit, t]);

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const handleUnblock = async () => {
    if (!client_id || !hairdresser_id || !professionCodeFromVisit) return;
    try {
      await unblockUser(
        client_id,
        hairdresser_id,
        professionCodeFromVisit,
        queryClient
      );
      setUnblockSuccessVisible(true);
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert(t("common.error"), t("moderation.unblockUserFailed"));
    }
  };

  const handleBlock = async (reason: string) => {
    if (!client_id || !hairdresser_id || !professionCodeFromVisit) return;
    try {
      await blockUser(
        client_id,
        hairdresser_id,
        reason,
        professionCodeFromVisit,
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
          client_id &&
          hairdresser_id &&
          professionCodeFromVisit ? (
            <ReportReasonPicker
              reporterId={client_id}
              reportedId={hairdresser_id}
              professionCode={professionCodeFromVisit}
              context="visit_other_pro_profile"
              onDone={() => setActiveAction(null)}
            />
          ) : null}
      </View>
    );
  };

  if (!hairdresser_id || !isUuid(hairdresser_id)) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={primaryGreen} />
        <View style={styles.routeUnavailable}>
          <Text style={styles.routeUnavailableText}>
            {t("profile.invalidProfileLink")}
          </Text>
        </View>
      </>
    );
  }

  if (profileLoading || !blockStateReady) {
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

  if (!data) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={primaryGreen} />
        <View style={styles.routeUnavailable}>
          <Text style={styles.routeUnavailableText}>
            {t("profile.couldNotLoadProfile")}
          </Text>
        </View>
      </>
    );
  }

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
        professionCodes={
          Array.isArray(data.profession_codes) ? data.profession_codes : null
        }
        activeProfessionCode={professionCodeFromVisit}
        viewerProfessionCodes={profile?.profession_codes}
        onBack={() => router.back()}
        showRelationshipCta={showRelationshipCta}
        isRelated={isRelated}
        relationshipStatusLoading={relationshipStatusLoading}
        addLoading={loading}
        onAddHairdresser={addHairdresser}
        headerRight={
          isViewingOwnProfile ? undefined : (
            <Pressable onPress={() => setIsModalVisible(true)} hitSlop={12}>
              <DotsThree size={32} color={primaryBlack} weight="bold" />
            </Pressable>
          )
        }
        analyticsProfessionCode={
          professionCodeFromVisit ??
          (Array.isArray(data.profession_codes) && data.profession_codes[0]
            ? String(data.profession_codes[0]).trim()
            : null)
        }
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

export default OtherProfessionalProfileScreen;

const styles = StyleSheet.create({
  removingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(241, 249, 244, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  routeUnavailable: {
    flex: 1,
    backgroundColor: primaryGreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsiveScale(24),
  },
  routeUnavailableText: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveScale(16),
    color: primaryBlack,
    textAlign: "center",
  },
});
