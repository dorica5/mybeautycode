import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretRight, Check, Plus } from "phosphor-react-native";
import { Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { responsiveScale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import {
  expandAccountRows,
  linkedAccountEntryFromSession,
  professionCodesList,
  type AccountSurfaceRow,
} from "@/src/lib/linkedAccountsStorage";
import { getLastProfessionCode, setLastProfessionCode } from "@/src/lib/lastVisitPreference";
import { pickActiveProfessionCode } from "@/src/constants/professionCodes";
import { useQueryClient } from "@tanstack/react-query";
import { useImageContext } from "@/src/providers/ImageProvider";

function rawParamFirst(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Where to go when leaving Switch account without picking a row.
 * Opening this screen from client uses `router.push` into the hairdresser tree, so
 * `router.back()` would pop to hairdresser home (wrong surface) instead of client.
 */
const RETURN_TO_HREF: Record<string, Href> = {
  "client-home": "/(client)/(tabs)/home",
  "client-profile": "/(client)/(tabs)/profile",
  "pro-profile": "/(hairdresser)/(tabs)/profile",
};

function resolveReturnHref(
  returnTo: string | undefined,
  activeSurface: "professional" | "client"
): Href {
  if (returnTo && returnTo in RETURN_TO_HREF) {
    return RETURN_TO_HREF[returnTo];
  }
  return activeSurface === "client"
    ? "/(client)/(tabs)/home"
    : "/(hairdresser)/(tabs)/home";
}

/** This screen lives under (hairdresser)-stack → pathname does not tell if user is on client UI. */
function resolveActiveSurface(
  param: string | undefined,
  rowCount: number,
  isHairdresser: boolean
): "professional" | "client" {
  if (param === "client") return "client";
  if (param === "professional") return "professional";
  if (rowCount <= 1) return "client";
  return isHairdresser ? "professional" : "client";
}

const SwitchAccountScreen = () => {
  const { profile, session, loading } = useAuth();
  const queryClient = useQueryClient();
  const { refreshInspirationImages } = useImageContext();
  const { activeSurface: activeSurfaceParam, returnTo: returnToParam } =
    useLocalSearchParams<{
      activeSurface?: string | string[];
      returnTo?: string | string[];
    }>();

  const [lastProfessionCode, setLastProfessionCodeState] = useState<
    string | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile?.id) return;
      void getLastProfessionCode(profile.id).then(setLastProfessionCodeState);
    }, [profile?.id])
  );

  const displayRows = useMemo((): AccountSurfaceRow[] => {
    const entry = linkedAccountEntryFromSession(session, profile);
    if (!entry || !profile) return [];
    return expandAccountRows(entry, profile);
  }, [session, profile]);

  const isHairdresser =
    profile?.user_type === "HAIRDRESSER" ||
    (profile as { userType?: string } | null)?.userType === "HAIRDRESSER";

  const activeSurface = useMemo(
    () =>
      resolveActiveSurface(
        rawParamFirst(activeSurfaceParam),
        displayRows.length,
        Boolean(isHairdresser)
      ),
    [activeSurfaceParam, displayRows.length, isHairdresser]
  );

  const handleBack = useCallback(() => {
    const target = resolveReturnHref(
      rawParamFirst(returnToParam),
      activeSurface
    );
    router.replace(target);
  }, [returnToParam, activeSurface]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack])
  );

  const rowIsCurrent = useCallback(
    (row: AccountSurfaceRow) => {
      if (!session?.user?.id || row.entry.id !== session.user.id) return false;
      if (row.surface === "client") {
        return activeSurface === "client";
      }
      if (activeSurface !== "professional") return false;
      const codes = professionCodesList(profile!);
      const active = pickActiveProfessionCode(codes, lastProfessionCode);
      if (row.professionCode == null) {
        return codes.length === 0 && active == null;
      }
      return active === row.professionCode;
    },
    [session?.user?.id, activeSurface, profile, lastProfessionCode]
  );

  const onSelectRow = useCallback(
    async (row: AccountSurfaceRow) => {
      const entry = linkedAccountEntryFromSession(session, profile);
      if (!entry || rowIsCurrent(row)) return;
      const uid = session?.user?.id;
      if (!uid) return;

      void queryClient.invalidateQueries({ queryKey: ["latest_haircodes"] });
      void queryClient.invalidateQueries({ queryKey: ["clientSearch"] });

      if (row.surface === "client") {
        /** Don’t await: inspiration fetch + signing blocks the transition; home loads in background. */
        void refreshInspirationImages(true, "hair");
        router.replace("/(client)/(tabs)/home");
        return;
      }

      if (row.professionCode) {
        /** One fast storage write so the destination reads the right profession; avoid awaiting network refresh. */
        await setLastProfessionCode(uid, row.professionCode);
        setLastProfessionCodeState(row.professionCode);
        void refreshInspirationImages(true, row.professionCode);
      }
      router.replace("/(hairdresser)/(tabs)/home");
    },
    [session, profile, rowIsCurrent, queryClient, refreshInspirationImages]
  );

  useEffect(() => {
    if (!profile?.id) return;
    void getLastProfessionCode(profile.id).then(setLastProfessionCodeState);
  }, [profile?.id, profile?.profession_codes, profile?.professions_detail]);

  if (loading || !profile || !session) {
    return (
      <View style={styles.outer}>
        <ActivityIndicator style={{ marginTop: 48 }} color={primaryBlack} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.outer}>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <TopNav
              title="My accounts"
              titleMarginBottom={46}
              onBackPress={handleBack}
            />

            <View style={styles.mainView}>
              <View style={styles.cardList}>
                {displayRows.map((row) => {
                  const isCurrent = rowIsCurrent(row);
                  return (
                    <Pressable
                      key={row.rowKey}
                      onPress={() => onSelectRow(row)}
                      disabled={isCurrent}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: isCurrent,
                        disabled: isCurrent,
                      }}
                      accessibilityLabel={`${row.roleLabel} ${row.entry.meta.name}${
                        row.detailLine ? ` ${row.detailLine}` : ""
                      }${isCurrent ? " current" : ""}`}
                      style={({ pressed }) => [
                        styles.accountCard,
                        !isCurrent && pressed && styles.accountCardPressed,
                      ]}
                    >
                      <View style={styles.accountCardTextCol}>
                        <Text style={styles.roleLabel}>{row.roleLabel}</Text>
                        <Text style={styles.nameLine}>{row.entry.meta.name}</Text>
                        {row.detailLine ? (
                          <Text style={styles.detailLine} numberOfLines={2}>
                            {row.detailLine}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.checkSlot}>
                        {isCurrent ? (
                          <View style={styles.checkBubble}>
                            <Check
                              size={responsiveScale(16)}
                              color={primaryWhite}
                              weight="bold"
                            />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={({ pressed }) => [
                    styles.addAccountRow,
                    pressed && styles.accountCardPressed,
                  ]}
                  onPress={() =>
                    router.push("/(setup)/AddProfession" as Href)
                  }
                >
                  <View style={styles.plusBubble}>
                    <Plus
                      size={responsiveScale(18)}
                      color={primaryWhite}
                      weight="bold"
                    />
                  </View>
                  <Text style={styles.addAccountText}>Add account</Text>
                  <CaretRight size={responsiveScale(24)} color={primaryBlack} />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
};

export default SwitchAccountScreen;

const CARD_RADIUS = responsiveScale(20);

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scalePercent(8),
  },
  mainView: {
    paddingHorizontal: scalePercent(5),
    paddingTop: 0,
  },
  cardList: {
    gap: responsiveScale(12),
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: responsiveScale(88),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(16),
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryGreen,
  },
  accountCardPressed: {
    opacity: 0.88,
  },
  accountCardTextCol: {
    flex: 1,
    marginRight: responsiveScale(12),
  },
  roleLabel: {
    ...Typography.label,
    color: primaryBlack,
    marginBottom: responsiveScale(4),
  },
  nameLine: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
  },
  detailLine: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.9,
    marginTop: responsiveScale(4),
  },
  /** Fixed width so cards without a check don't jump. */
  checkSlot: {
    width: responsiveScale(36),
    height: responsiveScale(36),
    justifyContent: "center",
    alignItems: "center",
  },
  checkBubble: {
    width: responsiveScale(34),
    height: responsiveScale(34),
    borderRadius: responsiveScale(17),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  addAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: responsiveScale(72),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(16),
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryGreen,
  },
  plusBubble: {
    width: responsiveScale(36),
    height: responsiveScale(36),
    borderRadius: responsiveScale(18),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
    marginRight: responsiveScale(12),
  },
  addAccountText: {
    ...Typography.outfitRegular16,
    flex: 1,
    color: primaryBlack,
  },
});
