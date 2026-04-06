import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretRight, Check, Plus } from "phosphor-react-native";
import { Href, router, useLocalSearchParams } from "expo-router";
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
  type LinkedAccountEntry,
} from "@/src/lib/linkedAccountsStorage";

type AccountRow = {
  entry: LinkedAccountEntry;
  surface: "professional" | "client";
  rowKey: string;
};

function rawParamFirst(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Denne skjermen ligger alltid under (hairdresser)-stack → pathname sier ikke om brukeren bruker klient-UI. */
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
  const { activeSurface: activeSurfaceParam } = useLocalSearchParams<{
    activeSurface?: string | string[];
  }>();

  const displayRows = useMemo((): AccountRow[] => {
    const entry = linkedAccountEntryFromSession(session, profile);
    if (!entry) return [];
    return expandAccountRows(entry).map(({ entry: e, surface }) => ({
      entry: e,
      surface,
      rowKey: `${e.id}-${surface}`,
    }));
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

  const rowIsCurrent = (
    entry: LinkedAccountEntry,
    surface: "professional" | "client"
  ) => {
    if (!session?.user?.id || entry.id !== session.user.id) return false;
    return surface === activeSurface;
  };

  const onSelectRow = (surface: "professional" | "client") => {
    const entry = linkedAccountEntryFromSession(session, profile);
    if (!entry || rowIsCurrent(entry, surface)) return;
    if (surface === "client") {
      router.replace("/(client)/(tabs)/home");
      return;
    }
    router.replace("/(hairdresser)/(tabs)/home");
  };

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
            <TopNav title="My accounts" titleMarginBottom={46} />

            <View style={styles.mainView}>
              <View style={styles.cardList}>
                {displayRows.map(({ entry: acc, surface, rowKey }) => {
                  const isCurrent = rowIsCurrent(acc, surface);
                  const roleLabel =
                    surface === "professional"
                      ? acc.meta.roleLabel
                      : "Client";
                  const detailLine =
                    surface === "professional" ? acc.meta.detail : "";
                  return (
                    <Pressable
                      key={rowKey}
                      onPress={() => onSelectRow(surface)}
                      disabled={isCurrent}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isCurrent, disabled: isCurrent }}
                      accessibilityLabel={`${roleLabel}, ${acc.meta.name}${isCurrent ? ", current" : ""}`}
                      style={({ pressed }) => [
                        styles.accountCard,
                        !isCurrent && pressed && styles.accountCardPressed,
                      ]}
                    >
                      <View style={styles.accountCardTextCol}>
                        <Text style={styles.roleLabel}>{roleLabel}</Text>
                        <Text style={styles.nameLine}>{acc.meta.name}</Text>
                        {detailLine ? (
                          <Text style={styles.detailLine} numberOfLines={2}>
                            {detailLine}
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
                    router.push("/(setup)/ChooseProfession" as Href)
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
  /** Fast bredde slik at kort uten hake ikke hopper i layout. */
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
