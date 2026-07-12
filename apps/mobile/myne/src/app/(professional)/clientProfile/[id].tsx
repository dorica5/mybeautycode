/* eslint-disable react/react-in-jsx-scope */
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useClientSearch, requestClientLink } from "@/src/api/profiles";
import { BlockedInlineNotice } from "@/src/components/BlockedProfileScreen";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useEffect, useState } from "react";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { router, type Href } from "expo-router";
import {
  useClientLinkUiStatus,
  clientLinkUiStatusQueryKey,
  type ClientLinkUiStatus,
} from "@/src/api/relationships";
import { unblockUser, useViewerBlockedTarget } from "@/src/api/moderation";
import { UnblockSuccessModal } from "@/src/components/UnblockSuccessModal";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { NavBackRow } from "@/src/components/NavBackRow";
import { ClientLinkRequestSentModal } from "@/src/components/ClientLinkRequestSentModal";
import { useQueryClient } from "@tanstack/react-query";
import {
  responsiveScale,
  responsiveMargin,
  responsivePadding,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { coerceRouteParam, isUuid } from "@/src/utils/isUuid";
import { useI18n } from "@/src/providers/LanguageProvider";
import { formatPhoneForDisplay } from "@/src/lib/profileFieldValidation";

/** Pro views an unlinked or pending client — mint "add client" only. Active links redirect to `/visits/[id]`. */
const UserProfile = () => {
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    id?: string | string[];
    client_id?: string | string[];
    full_name?: string | string[];
    phone_number?: string | string[];
    link_pending?: string | string[];
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
      }
    : undefined;

  const { session, profile: myProfile } = useAuth();
  const { activeProfessionCode, storedProfessionReady } =
    useActiveProfessionState(myProfile);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [unblockSuccessVisible, setUnblockSuccessVisible] = useState(false);
  const queryClient = useQueryClient();

  const hairdresser_id = session?.user.id;

  const paramStr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const navFullName = paramStr(params.full_name);
  const navPhone = paramStr(params.phone_number);
  const navLinkPending = paramStr(params.link_pending) === "true";

  const linkStatusQueryEnabled = Boolean(
    storedProfessionReady &&
      activeProfessionCode &&
      hairdresser_id &&
      client_id &&
      isUuid(client_id)
  );

  const initialLinkStatus: ClientLinkUiStatus | undefined = navLinkPending
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
    if (!isRelated || !client_id || !activeProfessionCode) return;
    router.replace({
      pathname: "/visits/[id]" as Href,
      params: {
        id: client_id,
        client_id,
        relationship: "true",
        ...(navFullName ? { full_name: navFullName } : {}),
        ...(navPhone ? { phone_number: navPhone } : {}),
        professionCode: activeProfessionCode,
      },
    });
  }, [isRelated, client_id, activeProfessionCode, navFullName, navPhone]);

  const { isBlocked: isBlockedUser, ready: blockStateReady } =
    useViewerBlockedTarget(hairdresser_id, client_id, activeProfessionCode);

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

  const displayUsername =
    typeof data?.username === "string" && data.username.trim()
      ? data.username.trim()
      : null;

  if (invalidClientId) {
    return (
      <SafeAreaView style={[styles.mintRoot, styles.mintCenter]} edges={["top"]}>
        <StatusBar style="dark" />
        <Text
          style={[
            Typography.bodySmall,
            { color: primaryBlack, textAlign: "center", padding: 24 },
          ]}
        >
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

  if (
    linkStateResolved === null ||
    !storedProfessionReady ||
    !activeProfessionCode ||
    !blockStateReady ||
    isRelated
  ) {
    return (
      <ThemedRouteLoading accessibilityLabel={t("profile.loadingProfile")} />
    );
  }

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
            {data?.full_name?.trim() ||
              formatPhoneForDisplay(data?.phone_number) ||
              t("common.client")}
          </Text>
          {displayUsername ? (
            <Text style={[Typography.anton26, styles.usernameMint]}>
              {displayUsername}
            </Text>
          ) : null}

          {isBlockedUser ? (
            <BlockedInlineNotice
              style={styles.mintButtonWrap}
              onUnblock={async () => {
                if (!hairdresser_id || !client_id || !activeProfessionCode)
                  return;
                await unblockUser(
                  hairdresser_id,
                  String(client_id),
                  activeProfessionCode,
                  queryClient
                );
                setUnblockSuccessVisible(true);
              }}
            />
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
      <UnblockSuccessModal
        visible={unblockSuccessVisible}
        onClose={() => setUnblockSuccessVisible(false)}
      />
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
});
