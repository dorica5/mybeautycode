import { KeyboardAvoidingView, Platform } from "react-native";

import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { useListAllClientSearch } from "@/src/api/profiles";
import { useLatestHaircodes } from "@/src/api/haircodes";
import HaircodeCard from "@/src/components/HaircodeCard";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  isTablet,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { CaretLeft } from "phosphor-react-native";
import { Typography } from "@/src/constants/Typography";
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
  useFocusEffect(
    useCallback(() => {
      console.log("IN PROFESSIONAL HOME");
    }, [])
  );
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [showSearchUI, setShowSearchUI] = useState(false);
  const [displayedResults, setDisplayedResults] = useState([]);

  const {
    data: searchResults = [],
    isLoading,
  } = useListAllClientSearch(debouncedQuery, profile?.id);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        setShowSearchUI(true);
      } else {
        setShowSearchUI(false);
        setDisplayedResults([]);
      }
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!isLoading && debouncedQuery && searchResults) {
      const resultsChanged =
        JSON.stringify(displayedResults) !== JSON.stringify(searchResults);
      if (resultsChanged) {
        setDisplayedResults(searchResults);
      }
    }
  }, [isLoading, searchResults, debouncedQuery, displayedResults]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const formatDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const { data: latestHaircodes = [] } = useLatestHaircodes(profile?.id);

  const filteredHaircodes =
    latestHaircodes?.filter((item) => {
      if (!item?.created_at) return false;
      const createdAt = new Date(item.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdAt >= sevenDaysAgo;
    }) ?? [];

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView
            style={styles.safe}
            edges={["top", "right", "left"]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                {router.canGoBack() ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tilbake"
                    onPress={() => router.back()}
                    style={styles.backRow}
                    hitSlop={12}
                  >
                    <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
                    <Text style={[Typography.bodyMedium, styles.backLabel]}>
                      Tilbake
                    </Text>
                  </Pressable>
                ) : null}

                <Text
                  style={[Typography.h3, styles.visitsTitle]}
                  accessibilityRole="header"
                >
                  My visits
                </Text>
                <Text
                  style={[Typography.anton16, styles.accountSubtitle]}
                  accessibilityLabel={professionLine}
                >
                  {professionLine}
                </Text>

                <Text style={[Typography.agLabel16, styles.searchLabel]}>
                  Search for clients
                </Text>
                <SearchInput
                  onSearch={handleSearch}
                  initialQuery={searchQuery}
                  placeholder="Search for clients"
                  variant="whitePill"
                  style={styles.searchPill}
                />
              </View>

              <View style={styles.contentContainer}>
                {showSearchUI ? (
                  <View style={{ flex: 1 }}>
                    <FlatList
                      data={displayedResults}
                      keyExtractor={(item, index) => `${item.id}_${index}`}
                      keyboardShouldPersistTaps="handled"
                      removeClippedSubviews={false}
                      maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                      }}
                      maxToRenderPerBatch={5}
                      updateCellsBatchingPeriod={50}
                      windowSize={10}
                      initialNumToRender={10}
                      renderItem={({ item }) => (
                        <SearchResults
                          item={item}
                          context="hairdresser"
                          query={debouncedQuery}
                        />
                      )}
                      ListEmptyComponent={
                        debouncedQuery ? (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.noResultsText}>
                              No results found for "{debouncedQuery}"
                            </Text>
                            <Text style={styles.helperText}>
                              Seems like your client hasn’t joined myHaircode
                              yet. You can invite them to download the app so
                              their hair history appears here next time you
                              search.
                            </Text>
                          </View>
                        ) : null
                      }
                    />
                  </View>
                ) : (
                  <>
                    {filteredHaircodes.length > 0 ? (
                      <>
                        <Text style={styles.sectionLabel}>Latest haircodes</Text>
                        <FlatList
                          data={filteredHaircodes}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <HaircodeCard
                              name={item.client_profile?.full_name}
                              date={formatDate(item.created_at)}
                              profilePicture={item.client_profile?.avatar_url}
                              salon_name=""
                              onPress={() => {
                                router.push({
                                  pathname: "/haircodes/single_haircode",
                                  params: {
                                    haircodeId: item.id,
                                    hairdresserName: profile?.full_name,
                                    hairdresser_profile_pic:
                                      profile?.avatar_url,
                                    salon_name: profile?.salon_name,
                                    salonPhoneNumber:
                                      profile?.salon_phone_number,
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
                              }}
                            />
                          )}
                          keyboardShouldPersistTaps="handled"
                          contentContainerStyle={styles.flatListContent}
                          ListEmptyComponent={null}
                        />
                      </>
                    ) : (
                      <View style={styles.emptyStateCard}>
                        <Text
                          style={[Typography.bodyLarge, styles.emptyStateCopy]}
                        >
                          Search for a client to get started
                        </Text>
                      </View>
                    )}
                  </>
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
    paddingTop: responsiveMargin(20),
    paddingBottom: responsiveMargin(8),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: responsiveMargin(4),
    marginBottom: responsiveMargin(8),
  },
  backLabel: { color: primaryBlack },
  /** Anton 36 — `Typography.h3` */
  visitsTitle: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(6),
  },
  accountSubtitle: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(20),
  },
  searchLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  searchPill: {
    alignSelf: "center",
    marginBottom: responsiveMargin(12),
  },
  contentContainer: {
    flex: 1,
    minHeight: responsiveScale(300),
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
  flatListContent: {
    marginBottom: responsiveMargin(40),
    paddingHorizontal: isTablet() ? responsivePadding(20) : 0,
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
  emptyStateCard: {
    marginHorizontal: responsivePadding(40),
    marginTop: responsiveMargin(8),
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    paddingVertical: responsivePadding(40, 32),
    paddingHorizontal: responsivePadding(20),
    borderWidth: 1,
    borderColor: `${primaryBlack}18`,
    maxWidth: 288,
    alignSelf: "center",
    width: "100%",
  },
  emptyStateCopy: {
    color: primaryBlack,
    textAlign: "center",
  },
});
