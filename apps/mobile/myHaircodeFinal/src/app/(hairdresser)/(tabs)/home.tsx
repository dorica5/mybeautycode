import { KeyboardAvoidingView, Platform } from "react-native";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useRouter } from "expo-router";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  StyleSheet,
  Text,
} from "react-native";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { useListAllClientSearch } from "@/src/api/profiles";
import { useLatestHaircodes } from "@/src/api/haircodes";
import HaircodeCard from "@/src/components/HaircodeCard";
import {
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

/** Horizontal padding for content under TopNav. */
const CONTENT_PAD_H = responsivePadding(24);

const HomeScreen = () => {
  const { profile } = useAuth();
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

  const {
    data: latestHaircodes = [],
  } = useLatestHaircodes(profile?.id);

  const filteredHaircodes =
    latestHaircodes?.filter((item) => {
      if (!item?.created_at) return false;
      const createdAt = new Date(item.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdAt >= sevenDaysAgo;
    }) ?? [];

  const hasAnyHaircodes = (latestHaircodes?.length ?? 0) > 0;
  const showEmptyVisitCard =
    !showSearchUI && filteredHaircodes.length === 0 && !hasAnyHaircodes;

  return (
    <>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardRoot}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
            <TopNav
              title="My clients"
              titleLine2="Hairdresser account"
              hideBack
              titleLine2Style={Typography.anton16}
            />

            <View style={styles.contentPadded}>
              <Text style={[Typography.agLabel16, styles.searchFieldLabel]}>
                Search for clients
              </Text>
              <View style={styles.searchInputOuter}>
                <SearchInput
                  onSearch={handleSearch}
                  initialQuery={searchQuery}
                  placeholder=""
                  variant="whitePill"
                  stretchWhitePill
                  pillBackgroundColor={primaryWhite}
                />
              </View>
            </View>

            <View style={styles.contentFlex}>
              {showSearchUI ? (
                <View style={[styles.contentPadded, styles.flexFill]}>
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
                        <View style={styles.emptySearchWrap}>
                          <Text style={styles.noResultsText}>
                            No results found for "{debouncedQuery}"
                          </Text>
                          <Text style={styles.helperText}>
                            Seems like your client hasn’t joined myHaircode yet.
                            You can invite them to download the app so their
                            hair history appears here next time you search.
                          </Text>
                        </View>
                      ) : null
                    }
                  />
                </View>
              ) : showEmptyVisitCard ? (
                <View style={[styles.contentPadded, styles.flexFill]}>
                  <View style={styles.emptyVisitCard}>
                    <Text style={styles.emptyVisitCardText}>
                      Search for a client to get started
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.contentPadded, styles.flexFill]}>
                  {latestHaircodes?.length > 0 && (
                    <Text style={styles.latestHeading}>Latest haircodes</Text>
                  )}
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
                        }}
                      />
                    )}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.flatListContent}
                    ListEmptyComponent={() => (
                      <Text style={styles.noResultsText}>
                        No haircodes added yet
                      </Text>
                    )}
                  />
                </View>
              )}
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  contentPadded: {
    paddingHorizontal: CONTENT_PAD_H,
  },
  searchFieldLabel: {
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  searchInputOuter: {
    width: "100%",
    marginBottom: responsiveMargin(12),
  },
  contentFlex: {
    flex: 1,
    minHeight: responsiveScale(200),
  },
  flexFill: {
    flex: 1,
  },
  emptyVisitCard: {
    height: responsiveScale(142),
    marginBottom: responsiveMargin(24),
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(12),
  },
  emptyVisitCardText: {
    ...Typography.ag20,
    textAlign: "center",
    color: primaryBlack,
  },
  latestHeading: {
    fontSize: responsiveFontSize(15, 14),
    fontFamily: "Inter-Semibold",
    marginBottom: responsiveMargin(10),
    color: primaryBlack,
  },
  noResultsText: {
    textAlign: "center",
    marginTop: responsiveMargin(20),
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-Regular",
    color: primaryBlack,
    opacity: 0.65,
  },
  flatListContent: {
    marginBottom: responsiveMargin(40),
    paddingBottom: responsiveMargin(16),
  },
  emptySearchWrap: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(12),
  },
  helperText: {
    marginTop: responsiveMargin(10),
    textAlign: "center",
    color: primaryBlack,
    opacity: 0.55,
    fontSize: responsiveFontSize(14, 11),
    fontFamily: "Inter-Regular",
    lineHeight: responsiveScale(20, 16),
  },
});
