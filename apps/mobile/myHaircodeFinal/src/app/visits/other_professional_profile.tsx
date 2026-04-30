import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Alert, Pressable, Text, ActivityIndicator } from "react-native";
import { DotsThree } from "phosphor-react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useAddHairdresser, useClientSearch } from "@/src/api/profiles";
import MyButton from "@/src/components/MyButton";
import { useAuth } from "@/src/providers/AuthProvider";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { Colors, primaryBlack, primaryGreen } from "@/src/constants/Colors";
import type { Profile } from "@/src/constants/types";
import RapportUserModal from "@/src/components/RapportUserModal";
import {
  ModerationSheetHeading,
  ModerationReasonRow,
  moderationDetailCopy,
  reportOtherReasonRowStyle,
} from "@/src/components/moderation/ModerationSheetParts";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  blockUser,
  isBlocked,
  REPORT_REASONS,
  ReportReason,
  reportUserEnhanced,
  unblockUser,
  UNBLOCK_RELATIONSHIP_RESET_ALERT,
} from "@/src/api/moderation";
import { useQueryClient } from "@tanstack/react-query";
import { useRelationshipCheck } from "@/src/api/relationships";
import { useRemoveRelationships } from "@/src/api/profiles";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import { responsiveScale } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { PublicProfessionalProfileView } from "@/src/components/PublicProfessionalProfileView";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { isUuid } from "@/src/utils/isUuid";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";

/**
 * Same public profile UI as `(client)/(tabs)/userList/professionalProfile/[id]` and
 * `(professional)/(tabs)/profile/professional_profile`, opened from visits.
 */
const OtherProfessionalProfileScreen = () => {
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

  const scopedDetail = useMemo(() => {
    if (!p?.professions_detail?.length || !professionCodeFromVisit) return null;
    return (
      p.professions_detail.find(
        (row) =>
          coerceProfessionCode(row.profession_code ?? undefined) ===
          professionCodeFromVisit
      ) ?? null
    );
  }, [p?.professions_detail, professionCodeFromVisit]);

  const data = p
    ? {
        full_name: p.full_name,
        first_name: p.first_name,
        username: p.username,
        avatar_url: p.avatar_url,
        about_me: scopedDetail?.about_me ?? p.about_me,
        salon_name: scopedDetail?.business_name ?? p.salon_name,
        business_address: scopedDetail?.business_address ?? p.business_address,
        salon_phone_number: scopedDetail?.business_number ?? p.salon_phone_number,
        booking_site: scopedDetail?.booking_site ?? p.booking_site,
        social_media: scopedDetail?.social_media ?? p.social_media,
        color_brand: p.color_brand,
        profession_codes: p.profession_codes,
      }
    : undefined;

  const { data: isRelated = false, isFetching: relLoading } =
    useRelationshipCheck(
      client_id ?? undefined,
      hairdresser_id,
      professionCodeFromVisit
    );
  const removeRelationships = useRemoveRelationships(client_id ?? "");

  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [blockCheckComplete, setBlockCheckComplete] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const { mutateAsync: addHairdresserDB } = useAddHairdresser(
    hairdresser_id,
    client_id,
    professionCodeFromVisit
  );

  const showRelationshipCta = Boolean(
    profile?.user_type === "CLIENT" &&
      profile?.id &&
      hairdresser_id &&
      profile.id !== hairdresser_id &&
      !isRelated
  );

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
    if (!professionCodeFromVisit) {
      Alert.alert(
        "Couldn't remove link",
        "We couldn't tell which role this is for. Open this professional from Discover or My professionals, then try again."
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
      Alert.alert("Error", "Failed to remove this professional.");
      throw error;
    }
  }, [
    client_id,
    hairdresser_id,
    professionCodeFromVisit,
    removeRelationships,
  ]);

  const addHairdresser = useCallback(async () => {
    if (!client_id || !hairdresser_id) return;
    setLoading(true);
    try {
      await addHairdresserDB();

      const message = `${profile?.full_name} has added you as their hairdresser.`;
      // Deliver to the pro's specific profession-account inbox so it doesn't
      // leak across their other profession accounts.
      await sendPushNotification(
        hairdresser_id as string,
        client_id as string,
        "FRIEND_REQUEST",
        message,
        {
          isClient: true,
          senderName: profile?.full_name,
          senderAvatar: profile?.avatar_url,
          ...(professionCodeFromVisit
            ? { profession_code: professionCodeFromVisit }
            : {}),
        },
        "New Client Added",
        professionCodeFromVisit ?? undefined
      );

      await queryClient.invalidateQueries({
        queryKey: ["relationship"],
      });
    } catch (error) {
      console.error("Error adding hairdresser:", error);
      Alert.alert("Error", "Failed to add hairdresser.");
    } finally {
      setLoading(false);
    }
  }, [addHairdresserDB, hairdresser_id, client_id, profile, queryClient]);

  const handleModalOption = (action: string) => {
    setPendingAction(action);
    setIsModalVisible(false);
  };

  const handleUnblock = async () => {
    if (!client_id || !hairdresser_id) return;
    try {
      await unblockUser(client_id, hairdresser_id, queryClient);
      setIsBlockedUser(false);
      Alert.alert(
        UNBLOCK_RELATIONSHIP_RESET_ALERT.title,
        UNBLOCK_RELATIONSHIP_RESET_ALERT.message
      );
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user");
    }
  };

  const handleBlock = async (reason: string) => {
    if (!client_id || !hairdresser_id) return;
    try {
      await blockUser(
        client_id,
        hairdresser_id,
        reason,
        queryClient as unknown as {
          invalidateQueries: (opts: unknown) => void;
        }
      );
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
          "Report received",
          "Thanks for letting us know. This account was restricted after repeated reports."
        );
      } else {
        Alert.alert("Report received", result.message);
      }

      setActiveAction(null);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "You have already reported this user"
      ) {
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
              disabled={removeRelationships.isPending}
              onPress={() => void deleteHairdresser().catch(() => {})}
            />
            <ModerationReasonRow
              label="Not now"
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
                label={reason}
                onPress={() => handleBlock(reason)}
              />
            )
          )}

        {activeAction === "Report" &&
          REPORT_REASONS.map((reason) => (
            <ModerationReasonRow
              key={reason.value}
              label={reason.label}
              style={
                reason.value === "other" ? reportOtherReasonRowStyle : undefined
              }
              onPress={() => handleReport(reason.value)}
            />
          ))}
      </View>
    );
  };

  if (!hairdresser_id || !isUuid(hairdresser_id)) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={primaryGreen} />
        <View style={styles.routeUnavailable}>
          <Text style={styles.routeUnavailableText}>
            This profile link isn&apos;t valid.
          </Text>
        </View>
      </>
    );
  }

  if (!blockCheckComplete || relLoading || profileLoading) {
    return <ThemedRouteLoading accessibilityLabel="Loading profile" />;
  }

  if (isBlockedUser) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
        <View style={styles.blockedWrap}>
          <MyButton
            style={[styles.unblockBtn, { borderColor: "red" }]}
            text="Unblock"
            onPress={handleUnblock}
          />
        </View>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <StatusBar style="dark" backgroundColor={primaryGreen} />
        <View style={styles.routeUnavailable}>
          <Text style={styles.routeUnavailableText}>
            We couldn&apos;t load this profile.
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
        bookingSite={data.booking_site ?? null}
        socialMediaRaw={data.social_media ?? null}
        colorBrandRaw={data.color_brand ?? null}
        professionCodes={
          Array.isArray(data.profession_codes) ? data.profession_codes : null
        }
        activeProfessionCode={professionCodeFromVisit}
        onBack={() => router.back()}
        showRelationshipCta={showRelationshipCta}
        isRelated={isRelated}
        addLoading={loading}
        onAddHairdresser={addHairdresser}
        headerRight={
          <Pressable onPress={() => setIsModalVisible(true)} hitSlop={12}>
            <DotsThree size={32} color={primaryBlack} weight="bold" />
          </Pressable>
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
        modalHeight="58%"
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
          accessibilityLabel="Removing professional"
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
  blockedWrap: {
    flex: 1,
    backgroundColor: Colors.light.primaryGreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsiveScale(24),
  },
  unblockBtn: {
    alignSelf: "stretch",
    maxWidth: 400,
  },
});
