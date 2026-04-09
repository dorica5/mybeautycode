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

  const formatDate = useCallback((createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const { data: latestHaircodes = [] } = useLatestHaircodes(profile?.id);

  const filteredHaircodes = useMemo(
    () =>
      latestHaircodes?.filter((item) => {
        if (!item?.created_at) return false;
        const createdAt = new Date(item.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return createdAt >= sevenDaysAgo;
      }) ?? [],
    [latestHaircodes]
  );

  const recentVisitIdsToPrefetch = useMemo(
    () =>
      filteredHaircodes
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 12),
    [filteredHaircodes]
  );

  useEffect(() => {
    for (const id of recentVisitIdsToPrefetch) {
      void prefetchHaircodeWithMedia(queryClient, id);
    }
  }, [queryClient, recentVisitIdsToPrefetch]);

  const openHaircode = useCallback(
    (item: (typeof filteredHaircodes)[number]) => {
      void prefetchHaircodeWithMedia(queryClient, item.id);
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
          createdAt: formatDate(item.created_at),
          full_name: item.client_profile?.full_name,
          number: item.client_profile?.phone_number,
          price: item.price,
          duration: item.duration,
        },
      });
    },
    [router, profile, formatDate, queryClient]
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
                        filteredHaircodes.length > 0 ? (
                          <View style={styles.haircodesFooter}>
                            <Text
                              style={[
                                styles.sectionLabel,
                                styles.sectionLabelInFooter,
                              ]}
                            >
                              Latest haircodes
                            </Text>
                            {filteredHaircodes.map((item) => (
                              <HaircodeCard
                                key={item.id}
                                name={item.client_profile?.full_name}
                                date={formatDate(item.created_at)}
                                profilePicture={item.client_profile?.avatar_url}
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
