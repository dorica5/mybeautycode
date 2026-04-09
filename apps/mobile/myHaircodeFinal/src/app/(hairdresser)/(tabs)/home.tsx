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
import { prefetchHaircodeWithMedia, useLatestHaircodes } from "@/src/api/haircodes";
import { useQueryClient } from "@tanstack/react-query";
import HaircodeCard from "@/src/components/HaircodeCard";
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
import {
  coerceProfessionCode,
  pickActiveProfessionCode,
  professionHomeAccountLabel,
} from "@/src/constants/professionCodes";
import {
  getLastProfessionCode,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";

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

function visitClientName(item: VisitListItem): string {
  return visitClientProfileNormalized(item)?.displayName ?? "Client";
}

function visitClientAvatarUrl(item: VisitListItem): string | undefined {
  return visitClientProfileNormalized(item)?.avatarUrl;
}

function visitClientPhone(item: VisitListItem): string {
  return visitClientProfileNormalized(item)?.phone ?? "";
}

const HomeScreen = () => {
  const { profile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [clientSearchFieldFocused, setClientSearchFieldFocused] =
    useState(false);

  const {
    data: searchResults = [],
    isLoading,
  } = useListAllClientSearch(debouncedQuery, profile?.id);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  const showClientSearchResults =
    clientSearchFieldFocused && debouncedQuery.trim().length > 0;

  const clientListData = (showClientSearchResults ? searchResults : []) as never[];

  /** Same as `see_haircode` / “View all visits” list. */
  const formatVisitListDate = useCallback((createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const { data: latestHaircodes = [] } = useLatestHaircodes(profile?.id);

  const latestVisitsSorted = useMemo(() => {
    const raw = latestHaircodes as VisitListItem[];
    if (!Array.isArray(raw)) return [];
    const withDates = raw.filter((item) => {
      const ts = visitCreatedAtIso(item);
      if (!ts) return false;
      return !Number.isNaN(new Date(ts).getTime());
    });
    return [...withDates].sort(
      (a, b) =>
        new Date(visitCreatedAtIso(b)!).getTime() -
        new Date(visitCreatedAtIso(a)!).getTime()
    );
  }, [latestHaircodes]);

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
      void prefetchHaircodeWithMedia(queryClient, item.id);
      const ts = visitCreatedAtIso(item);
      router.push({
        pathname: "/haircodes/single_haircode",
        params: {
          haircodeId: item.id,
          hairdresserName: profile?.full_name,
          hairdresser_profile_pic: profile?.avatar_url,
          salon_name: profile?.salon_name,
          salonPhoneNumber: profile?.salon_phone_number,
          about_me: profile?.about_me,
          booking_site: profile?.booking_site,
          social_media: profile?.social_media,
          description: item.service_description,
          services: item.services,
          createdAt: ts ? formatVisitListDate(ts) : "",
          full_name: visitClientName(item),
          number: visitClientPhone(item),
          price: item.price,
          duration: item.duration,
        },
      });
    },
    [router, profile, formatVisitListDate, queryClient]
  );

  const [professionLine, setProfessionLine] = useState("Professional account");

  const professionCodesFromProfile =
    profile?.profession_codes ??
    (profile as { professionCodes?: string[] })?.professionCodes;

  const professionCodesKey = useMemo(
    () => professionCodesFromProfile?.join(",") ?? "",
    [professionCodesFromProfile]
  );

  useEffect(() => {
    const uid = profile?.id;
    if (!uid) return;
    const codes = professionCodesFromProfile;
    let cancelled = false;
    (async () => {
      const stored = await getLastProfessionCode(uid);
      if (cancelled) return;
      const picked = pickActiveProfessionCode(codes, stored);
      const firstListRaw =
        codes?.find((c) => coerceProfessionCode(c) != null) ?? codes?.[0];
      setProfessionLine(professionHomeAccountLabel(picked, firstListRaw));
      const codeToStore =
        picked ??
        coerceProfessionCode(firstListRaw ?? undefined) ??
        coerceProfessionCode(stored ?? undefined);
      if (codeToStore) await setLastProfessionCode(uid, codeToStore);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, professionCodesKey]);

  const visitCards = useMemo(
    () =>
      latestVisitsSorted.map((item) => (
        <HaircodeCard
          key={item.id}
          name={visitClientName(item)}
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
    [latestVisitsSorted, formatVisitListDate, queryClient, openHaircode]
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
                  My clients
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
                  Search for clients
                </Text>
                <SearchInput
                  onSearch={handleSearch}
                  initialQuery=""
                  value={searchQuery}
                  placeholder="Search for clients"
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
                        Latest visits
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
                        Search for a client to get started
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
                              No results found for "{debouncedQuery.trim()}"
                            </Text>
                            <Text style={styles.helperText}>
                              {`Seems like your client hasn't joined ${BRAND_DISPLAY_NAME} yet. You can invite them to download the app.`}
                            </Text>
                          </View>
                        )
                      }
                      ListFooterComponent={
                        latestVisitsSorted.length > 0 ? (
                          <View style={styles.haircodesFooter}>
                            <Text
                              style={[
                                styles.sectionLabel,
                                styles.sectionLabelInFooter,
                              ]}
                            >
                              Latest visits
                            </Text>
                            {latestVisitsSorted.map((item) => (
                              <HaircodeCard
                                key={item.id}
                                name={visitClientName(item)}
                                date={
                                  visitCreatedAtIso(item)
                                    ? formatVisitListDate(
                                        visitCreatedAtIso(item)!
                                      )
                                    : ""
                                }
                                profilePicture={visitClientAvatarUrl(item)}
                                salon_name=""
                                onPressIn={() =>
                                  prefetchHaircodeWithMedia(queryClient, item.id)
                                }
                                onPress={() => openHaircode(item)}
                              />
                            ))}
                          </View>
                        ) : null
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
  haircodesFooter: {
    marginTop: responsiveMargin(16),
    paddingTop: responsivePadding(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${primaryBlack}18`,
  },
  sectionLabelInFooter: {
    paddingHorizontal: 0,
    marginBottom: responsiveMargin(8),
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: responsivePadding(20),
  },
  sectionLabel: {
    fontSize: responsiveFontSize(15, 14),
    paddingHorizontal: responsivePadding(20),
    fontFamily: "Inter-Semibold",
    marginBottom: responsiveMargin(10),
    color: primaryBlack,
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
