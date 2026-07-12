import { KeyboardAvoidingView, Platform } from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { useListAllClientSearch } from "@/src/api/profiles";
import { blockedIdListQueryKey, blockedIds } from "@/src/api/moderation";
import { prefetchHaircodeWithMedia, useLatestHaircodes } from "@/src/api/visits";
import { useQueryClient } from "@tanstack/react-query";
import VisitCard from "@/src/components/VisitCard";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { Typography } from "@/src/constants/Typography";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { useClearOnProfessionChange } from "@/src/hooks/useClearOnProfessionChange";
import { useI18n, formatVisitListDateForLocale } from "@/src/providers/LanguageProvider";
import { useVisitLimitGate } from "@/src/hooks/useVisitLimitGate";

const LATEST_VISITS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type VisitListItem = {
  id: string;
  created_at?: string | null;
  createdAt?: string | null;
  service_description?: string | null;
  services?: unknown;
  price?: string | null;
  duration?: string | null;
  client_profile?: VisitClientProfileRaw | null;
  clientProfile?: VisitClientProfileRaw | null;
};

type VisitClientProfileRaw = {
  full_name?: string | null;
  fullName?: string | null;
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
};

function visitCreatedAtIso(item: VisitListItem): string | undefined {
  const raw = item.created_at ?? item.createdAt ?? undefined;
  if (raw == null || String(raw).length === 0) return undefined;
  return String(raw);
}

function visitClientProfileNormalized(
  item: VisitListItem
): { displayName: string; avatarUrl?: string; phone: string } | null {
  const c = item.client_profile ?? item.clientProfile;
  if (!c) return null;

  const full =
    c.full_name?.trim() ||
    c.fullName?.trim() ||
    "";
  const fn = c.first_name?.trim() || c.firstName?.trim() || "";
  const ln = c.last_name?.trim() || c.lastName?.trim() || "";
  const displayName = full || `${fn} ${ln}`.trim();
  if (!displayName) return null;

  const avatarUrl =
    c.avatar_url?.trim() || c.avatarUrl?.trim() || undefined;
  const phone =
    c.phone_number?.trim() || c.phoneNumber?.trim() || "";

  return { displayName, avatarUrl, phone };
}

function visitClientName(item: VisitListItem, clientLabel: string): string {
  return visitClientProfileNormalized(item)?.displayName ?? clientLabel;
}

function visitClientAvatarUrl(item: VisitListItem): string | undefined {
  return visitClientProfileNormalized(item)?.avatarUrl;
}

function visitClientPhone(item: VisitListItem): string {
  return visitClientProfileNormalized(item)?.phone ?? "";
}

const HomeScreen = () => {
  const { t, locale } = useI18n();
  const { guard: guardViewVisits } = useVisitLimitGate("view");
  const { profile, session } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [clientSearchFieldFocused, setClientSearchFieldFocused] =
    useState(false);

  const { activeProfessionCode, professionLine, storedProfessionReady } =
    useActiveProfessionState(profile);

  const {
    data: searchResults = [],
    isLoading,
  } = useListAllClientSearch(
    debouncedQuery,
    profile?.id,
    activeProfessionCode
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const uid = profile?.id;
    if (!uid) return;
    void queryClient.prefetchQuery({
      queryKey: blockedIdListQueryKey(uid),
      queryFn: () => blockedIds(uid),
      staleTime: 120_000,
    });
  }, [profile?.id, queryClient]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /** Only toggles list visibility; clearing text is done on outside tap so row taps still navigate. */
  const handleClientSearchBlur = useCallback(() => {
    setClientSearchFieldFocused(false);
  }, []);

  const dismissClientSearchOverlay = useCallback(() => {
    Keyboard.dismiss();
    setClientSearchFieldFocused(false);
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  useClearOnProfessionChange(
    activeProfessionCode,
    storedProfessionReady,
    dismissClientSearchOverlay
  );

  const showClientSearchResults =
    clientSearchFieldFocused && debouncedQuery.trim().length > 0;

  const clientListData = (showClientSearchResults ? searchResults : []) as never[];

  /** Same as `see_visits` / “View all visits” list. */
  const formatVisitListDate = useCallback(
    (createdAt: string) => formatVisitListDateForLocale(locale, createdAt),
    [locale]
  );

  const { data: latestHaircodes = [] } = useLatestHaircodes(
    profile?.id,
    activeProfessionCode,
    { activeProfessionReady: storedProfessionReady }
  );

  const latestVisitsSorted = useMemo(() => {
    const raw = latestHaircodes as VisitListItem[];
    if (!Array.isArray(raw)) return [];
    const cutoff = Date.now() - LATEST_VISITS_MAX_AGE_MS;
    const withDates = raw.filter((item) => {
      const ts = visitCreatedAtIso(item);
      if (!ts) return false;
      const createdMs = new Date(ts).getTime();
      if (Number.isNaN(createdMs)) return false;
      return createdMs >= cutoff;
    });
    return [...withDates].sort(
      (a, b) =>
        new Date(visitCreatedAtIso(b)!).getTime() -
        new Date(visitCreatedAtIso(a)!).getTime()
    );
  }, [latestHaircodes]);

  const clients = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; phone: string }[] = [];
    for (const item of latestVisitsSorted) {
      const norm = visitClientProfileNormalized(item);
      if (!norm) continue;
      const key = `${norm.phone}|${norm.displayName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: norm.displayName, phone: norm.phone });
    }
    return out;
  }, [latestVisitsSorted]);

  useEffect(() => {
    const searchText = debouncedQuery;
    const trimmed = searchText.trim();
    if (!trimmed || !profile?.id || !activeProfessionCode) return;

    const hairdresserId = profile.id;
    const q = trimmed.toLowerCase();
    const filteredClients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(trimmed.replace(/\s/g, ""))
    );

    console.log("AUTH USER ID:", session?.user?.id);
    console.log("PROFILE ID USED:", profile?.id);
    console.log("HAIRDRESSER ID USED:", hairdresserId);
    console.log("SEARCH TEXT RAW:", searchText);
    console.log(
      "SEARCH TEXT CHARS:",
      [...searchText].map((c) => c.charCodeAt(0))
    );
    console.log("ALL CLIENTS BEFORE SEARCH:", clients);
    console.log("FILTERED CLIENTS:", filteredClients);
  }, [
    debouncedQuery,
    profile?.id,
    activeProfessionCode,
    session?.user?.id,
    clients,
  ]);

  const hasLatestVisits = latestVisitsSorted.length > 0;

  const recentVisitIdsToPrefetch = useMemo(
    () =>
      latestVisitsSorted
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 12),
    [latestVisitsSorted]
  );

  useEffect(() => {
    for (const id of recentVisitIdsToPrefetch) {
      void prefetchHaircodeWithMedia(queryClient, id);
    }
  }, [queryClient, recentVisitIdsToPrefetch]);

  const openHaircode = useCallback(
    (item: VisitListItem) => {
      if (!guardViewVisits()) return;
      void prefetchHaircodeWithMedia(queryClient, item.id);
      const ts = visitCreatedAtIso(item);
      router.push({
        pathname: "/visits/single_visit",
        params: {
          haircodeId: item.id,
          /** Pro/business fields come from `/api/visits/:id` (visit’s profession). Do not pass active account here. */
          description: item.service_description,
          services:
            item.services == null
              ? ""
              : typeof item.services === "string"
                ? item.services
                : JSON.stringify(item.services),
          createdAt: ts ? formatVisitListDate(ts) : "",
          full_name: visitClientName(item, t("common.client")),
          number: visitClientPhone(item),
          price: item.price,
          duration: item.duration,
        },
      });
    },
    [router, formatVisitListDate, queryClient, t, guardViewVisits]
  );

  const visitCards = useMemo(
    () =>
      latestVisitsSorted.map((item) => (
        <VisitCard
          key={item.id}
          name={visitClientName(item, t("common.client"))}
          date={
            visitCreatedAtIso(item)
              ? formatVisitListDate(visitCreatedAtIso(item)!)
              : ""
          }
          profilePicture={visitClientAvatarUrl(item)}
          salon_name=""
          onPressIn={() => prefetchHaircodeWithMedia(queryClient, item.id)}
          onPress={() => openHaircode(item)}
        />
      )),
    [latestVisitsSorted, formatVisitListDate, queryClient, openHaircode, t]
  );

  return (
    <>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: primaryGreen }}
      >
        <TouchableWithoutFeedback onPress={dismissClientSearchOverlay}>
          <SafeAreaView
            style={styles.safe}
            edges={["top", "right", "left"]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Text
                  style={[Typography.h3, styles.visitsTitle]}
                  accessibilityRole="header"
                >
                  {t("home.proTitle")}
                </Text>
                <Text
                  style={[Typography.anton16, styles.accountSubtitle]}
                  accessibilityLabel={professionLine}
                >
                  {professionLine}
                </Text>
              </View>

              <View style={styles.contentContainer}>
                <Text style={[Typography.agLabel16, styles.searchLabelOnGreen]}>
                  {t("home.proSearchLabel")}
                </Text>
                <SearchInput
                  key={activeProfessionCode ?? "pro-lane"}
                  onSearch={handleSearch}
                  initialQuery=""
                  value={searchQuery}
                  placeholder={t("home.proSearchPlaceholder")}
                  variant="whitePill"
                  whitePillFill={primaryWhite}
                  whitePillStretch
                  style={styles.searchPillOnGreen}
                  onFocus={() => setClientSearchFieldFocused(true)}
                  onBlur={handleClientSearchBlur}
                />

                {!showClientSearchResults ? (
                  hasLatestVisits ? (
                    <ScrollView
                      style={styles.latestVisitsScroll}
                      contentContainerStyle={styles.latestVisitsScrollContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      <Text
                        style={[
                          Typography.agLabel16,
                          styles.latestVisitsSectionTitle,
                        ]}
                      >
                        {t("home.latestVisits")}
                      </Text>
                      {visitCards}
                    </ScrollView>
                  ) : (
                    <View style={styles.idlePromptCard}>
                      <Text
                        style={[
                          Typography.outfitRegular16,
                          styles.idlePromptText,
                        ]}
                      >
                        {t("home.proIdlePrompt")}
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={[styles.resultsCard, styles.resultsCardFlex]}>
                    <FlatList
                      data={clientListData}
                      keyExtractor={(item, index) => {
                        const row = item as {
                          client_id?: string;
                          id?: string;
                        };
                        return `${row.client_id ?? row.id ?? "row"}_${index}`;
                      }}
                      keyboardShouldPersistTaps="handled"
                      removeClippedSubviews={false}
                      style={styles.searchResultsList}
                      contentContainerStyle={styles.searchResultsListContent}
                      maxToRenderPerBatch={10}
                      updateCellsBatchingPeriod={50}
                      windowSize={10}
                      initialNumToRender={12}
                      renderItem={({ item }) => (
                        <SearchResults
                          item={item}
                          context="hairdresser"
                          query={debouncedQuery}
                          professionCode={activeProfessionCode}
                        />
                      )}
                      ListEmptyComponent={
                        isLoading ? (
                          <View style={styles.loadingClients}>
                            <ActivityIndicator color={primaryBlack} />
                          </View>
                        ) : (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.noResultsText}>
                              {t("home.noResultsFor", {
                                query: debouncedQuery.trim(),
                              })}
                            </Text>
                            <Text style={styles.helperText}>
                              {t("home.clientInviteHelper", {
                                brand: BRAND_DISPLAY_NAME,
                              })}
                            </Text>
                          </View>
                        )
                      }
                    />
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  header: {
    paddingHorizontal: responsivePadding(24),
    paddingTop: responsiveMargin(36),
    paddingBottom: responsiveMargin(8),
  },
  /** Anton 36 — `Typography.h3` */
  visitsTitle: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: 0,
    marginBottom: responsiveMargin(6),
  },
  accountSubtitle: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(16),
  },
  searchLabelOnGreen: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  searchPillOnGreen: {
    marginBottom: responsiveMargin(14),
  },
  latestVisitsScroll: {
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
  },
  latestVisitsScrollContent: {
    paddingBottom: responsivePadding(24),
    flexGrow: 1,
  },
  latestVisitsSectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(12),
    alignSelf: "flex-start",
  },
  idlePromptCard: {
    alignSelf: "stretch",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(22),
    borderWidth: 1,
    borderColor: `${primaryBlack}12`,
    justifyContent: "center",
    alignItems: "center",
    minHeight: responsiveScale(132),
    paddingVertical: responsivePadding(36),
    paddingHorizontal: responsivePadding(24),
    marginBottom: responsiveMargin(8),
  },
  idlePromptText: {
    textAlign: "center",
    maxWidth: responsiveScale(280),
  },
  resultsCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(22),
    borderWidth: 1,
    borderColor: `${primaryBlack}12`,
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsivePadding(12),
    paddingBottom: responsivePadding(12),
    marginBottom: responsiveMargin(8),
  },
  resultsCardFlex: {
    flex: 1,
    minHeight: 0,
  },
  searchResultsList: {
    flex: 1,
    minHeight: 0,
    marginTop: responsiveMargin(4),
  },
  searchResultsListContent: {
    paddingBottom: responsivePadding(12),
    flexGrow: 1,
  },
  loadingClients: {
    paddingVertical: responsivePadding(24),
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: responsivePadding(20),
  },
  noResultsText: {
    textAlign: "center",
    marginTop: responsiveMargin(20),
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Regular",
    color: "grey",
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
  },
  helperText: {
    marginTop: responsiveMargin(10),
    textAlign: "center",
    color: "grey",
    fontSize: responsiveFontSize(14, 11),
    fontFamily: "Inter-Regular",
    lineHeight: responsiveScale(20, 16),
  },
});
