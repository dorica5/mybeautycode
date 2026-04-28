import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { CaretLeft, Eye, Globe, ShareNetwork } from "phosphor-react-native";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/src/providers/AuthProvider";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { fetchMyProfessionalAnalytics } from "@/src/api/professionalAnalytics";
import { FONT_FAMILY, Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";

function formatInt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const ProfessionalInsightsScreen = () => {
  const { profile } = useAuth();
  const { activeProfessionCode, professionLine, storedProfessionReady } =
    useActiveProfessionState(profile);

  const professionParam = useMemo(() => {
    if (!activeProfessionCode) return null;
    return activeProfessionCode === "brows" ? "brows_lashes" : activeProfessionCode;
  }, [activeProfessionCode]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["professional-analytics", "me", professionParam],
    queryFn: () => fetchMyProfessionalAnalytics(professionParam),
    enabled: storedProfessionReady && !!professionParam,
  });

  useFocusEffect(
    useCallback(() => {
      if (professionParam) void refetch();
    }, [professionParam, refetch])
  );

  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.outer}>
        <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.paddedHorizontal}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backRow}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
                <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.heroBleed,
                {
                  width: patternWidth,
                  marginLeft: -insets.left,
                  marginRight: -insets.right,
                  height: heroHeight,
                },
              ]}
            >
              <View style={[styles.hero, { height: heroHeight }]}>
                <OrganicPattern
                  width={patternWidth}
                  height={heroHeight}
                  preserveAspectRatio="xMidYMid slice"
                  style={{
                    transform: [{ translateY: -heroPatternVerticalNudge }],
                  }}
                />
              </View>
            </View>

            <View style={styles.paddedHorizontal}>
              <Text style={[Typography.h3, styles.title]}>Your reach</Text>
              <Text style={[Typography.outfitRegular16, styles.subtitle]}>
                How clients engage with your public profile
                {professionLine ? ` · ${professionLine}` : ""}.
              </Text>

              {!storedProfessionReady || !professionParam ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={primaryBlack} />
                </View>
              ) : isLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={primaryBlack} />
                </View>
              ) : isError ? (
                <View style={styles.errorCard}>
                  <Text style={[Typography.outfitRegular16, styles.errorText]}>
                    Could not load stats. Pull to retry or check your connection.
                  </Text>
                  <Pressable
                    onPress={() => refetch()}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                  >
                    <Text style={[Typography.label, styles.retryLabel]}>Try again</Text>
                  </Pressable>
                </View>
              ) : data ? (
                <View style={styles.cards}>
                  <View style={styles.statCard}>
                    <View style={styles.statIconRow}>
                      <Eye size={responsiveScale(26)} color={primaryBlack} weight="duotone" />
                      <Text style={[Typography.label, styles.statLabel]}>Profile views</Text>
                    </View>
                    <Text style={styles.statNumber}>{formatInt(data.profileViewCount)}</Text>
                    <Text style={[Typography.outfitRegular16, styles.statHint]}>
                      Times someone opened this profession&apos;s public profile
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIconRow}>
                      <Globe size={responsiveScale(26)} color={primaryBlack} weight="duotone" />
                      <Text style={[Typography.label, styles.statLabel]}>Booking taps</Text>
                    </View>
                    <Text style={styles.statNumber}>{formatInt(data.bookingClickCount)}</Text>
                    <Text style={[Typography.outfitRegular16, styles.statHint]}>
                      Taps on your booking link
                    </Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardLast]}>
                    <View style={styles.statIconRow}>
                      <ShareNetwork
                        size={responsiveScale(26)}
                        color={primaryBlack}
                        weight="duotone"
                      />
                      <Text style={[Typography.label, styles.statLabel]}>Social taps</Text>
                    </View>
                    <Text style={styles.statNumber}>{formatInt(data.socialClickCount)}</Text>
                    <Text style={[Typography.outfitRegular16, styles.statHint]}>
                      Taps on Instagram, TikTok, or other social links
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[Typography.bodySmall, styles.footerNote]}>
                Totals for the profession you have selected with Switch account. Change
                account there to view another lane.
              </Text>
            </View>
          </ScrollView>
          {isRefetching && !isLoading ? (
            <View
              style={[styles.refetchHint, { right: insets.right + responsivePadding(20) }]}
              pointerEvents="none"
            >
              <ActivityIndicator size="small" color={primaryBlack} />
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </>
  );
};

export default ProfessionalInsightsScreen;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsiveScale(32),
  },
  paddedHorizontal: {
    paddingHorizontal: responsivePadding(24),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
    alignSelf: "flex-start",
  },
  backText: {
    color: primaryBlack,
  },
  heroBleed: {
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(-30),
    overflow: "hidden",
  },
  hero: {
    backgroundColor: primaryGreen,
    overflow: "hidden",
    width: "100%",
  },
  title: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(8),
  },
  subtitle: {
    color: primaryBlack,
    opacity: 0.85,
    textAlign: "center",
    marginBottom: responsiveMargin(28),
    paddingHorizontal: responsivePadding(8),
  },
  loadingBlock: {
    paddingVertical: responsiveScale(48),
    alignItems: "center",
  },
  errorCard: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: responsiveScale(20),
    padding: responsivePadding(20),
    alignItems: "center",
  },
  errorText: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(16),
  },
  retryBtn: {
    backgroundColor: primaryBlack,
    paddingHorizontal: responsiveScale(24),
    paddingVertical: responsiveScale(12),
    borderRadius: responsiveScale(999),
  },
  retryLabel: {
    color: primaryWhite,
  },
  cards: {
    gap: responsiveMargin(14),
  },
  statCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(22),
    padding: responsivePadding(22),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(33, 36, 39, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: responsiveScale(4) },
    shadowOpacity: 0.08,
    shadowRadius: responsiveScale(12),
    elevation: 3,
  },
  statCardLast: {
    marginBottom: responsiveMargin(8),
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(10),
    marginBottom: responsiveMargin(12),
  },
  statLabel: {
    color: primaryBlack,
    letterSpacing: 0.5,
  },
  statNumber: {
    fontFamily: FONT_FAMILY.anton,
    fontSize: responsiveScale(40),
    // ~125% of size — matches Anton display usage in Typography; tighter lineHeights clip the caps
    lineHeight: responsiveScale(50),
    color: primaryBlack,
    marginTop: responsiveScale(4),
    marginBottom: responsiveMargin(8),
  },
  statHint: {
    color: "rgba(33, 36, 39, 0.72)",
    lineHeight: responsiveScale(22),
  },
  footerNote: {
    color: "rgba(33, 36, 39, 0.65)",
    textAlign: "center",
    marginTop: responsiveMargin(12),
    lineHeight: responsiveScale(20),
  },
  refetchHint: {
    position: "absolute",
    top: responsiveScale(12),
  },
});
