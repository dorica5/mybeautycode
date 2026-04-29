import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import SearchInput from "@/src/components/SearchInput";
import SearchResults from "@/src/components/SearchResults";
import { useListAllHairdresserSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { StatusBar } from "expo-status-bar";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Typography } from "@/src/constants/Typography";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";

type Profession = "hair" | "nails" | "brows";

function parseProfession(p: string | undefined): Profession | undefined {
  if (p === "hair" || p === "nails" || p === "brows") return p;
  return undefined;
}

const FindProfessionalsScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profession } = useLocalSearchParams<{ profession?: string }>();
  const professionKey = parseProfession(profession);

  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [displayedResults, setDisplayedResults] = useState([]);

  const { profile } = useAuth();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const { data: searchResults = [], isLoading } = useListAllHairdresserSearch(
    debouncedQuery,
    profile?.id,
    professionKey
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      if (isFocused) {
        setSearchQuery("");
        setDebouncedQuery("");
        setDisplayedResults([]);
      }
    });

    return unsubscribe;
  }, [navigation, isFocused]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!isLoading && searchResults.length >= 0 && debouncedQuery) {
      setDisplayedResults(searchResults);
    }
  }, [isLoading, searchResults, debouncedQuery]);

  const handleSearch = useCallback(
    (query: string) => setSearchQuery(query),
    []
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setDisplayedResults([]);
  }, []);

  const goToMap = useCallback(() => {
    // Profession already chosen on the previous (filter) step -> jump straight to the map.
    // Fallback (no param): bounce to the filter screen so the user picks one first.
    if (professionKey) {
      router.push({
        pathname: "/(client)/(tabs)/userList/map",
        params: { profession: professionKey },
      });
    } else {
      router.push("/(client)/(tabs)/userList/filter-before-map");
    }
  }, [professionKey]);

  return (
    <>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <View style={navBackChromeStyles.screenBar}>
              <NavBackRow onPress={() => router.back()} />
            </View>

            <FlatList
              data={debouncedQuery ? displayedResults : []}
              keyExtractor={(item, index) =>
                `${item.hairdresser_id}_${index}`
              }
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={10}
              initialNumToRender={10}
              ListHeaderComponent={
                <>
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
                  <View style={styles.headerBlock}>
                    <View style={styles.topCenter}>
                      <Text style={[Typography.h3, styles.title]}>
                        Find professionals
                      </Text>
                    </View>

                    <View style={styles.searchSection}>
                      <Text style={styles.fieldLabel}>
                        Search for specific professional
                      </Text>
                      <SearchInput
                        variant="whitePill"
                        /**
                         * Controlled: parent owns the text. Short-circuits
                         * the uncontrolled effect chain in SearchInput that
                         * otherwise interacts with TextInput's internal
                         * useLayoutEffect and trips the "Maximum update
                         * depth" guard on rapid typing.
                         */
                        value={searchQuery}
                        onSearch={handleSearch}
                        initialQuery={searchQuery}
                        placeholder="Search…"
                        clearSearch={clearSearch}
                      />
                    </View>

                    <View style={styles.mapSection}>
                      <PaddedLabelButton
                        title="Go to map"
                        horizontalPadding={0}
                        verticalPadding={0}
                        onPress={goToMap}
                        style={styles.mapCta}
                        textStyle={styles.mapCtaLabel}
                      />
                    </View>
                  </View>
                </>
              }
              renderItem={({ item }) => (
                <SearchResults
                  item={item}
                  context="client"
                  query={debouncedQuery}
                  professionCode={professionKey}
                />
              )}
              ListEmptyComponent={
                debouncedQuery ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.noResultsText}>
                      No results found for &quot;{debouncedQuery}&quot;
                    </Text>
                    {[
                      "cutters",
                      "nikita",
                      "sayso",
                      "fredrik & louisa",
                      "dada hårstudio",
                    ].some((chain) =>
                      debouncedQuery.toLowerCase().includes(chain)
                    ) ? (
                      <Text style={styles.helperText}>
                        This app is for individual hairdressers, not salon chains
                        like {debouncedQuery}.
                      </Text>
                    ) : (
                      <Text style={styles.helperText}>
                        {`Seems like your hairdresser hasn't started using ${BRAND_DISPLAY_NAME} yet. Tip them about it so they're here next time you search!`}
                      </Text>
                    )}
                  </View>
                ) : null
              }
              contentContainerStyle={styles.resultsContainer}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </>
  );
};

export default FindProfessionalsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  heroBleed: {
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(-30),
    overflow: "hidden",
    alignSelf: "center",
  },
  hero: {
    backgroundColor: primaryGreen,
    overflow: "hidden",
    width: "100%",
  },
  headerBlock: {
    paddingHorizontal: responsivePadding(16),
    paddingBottom: responsivePadding(8),
    width: "100%",
    alignSelf: "stretch",
  },
  topCenter: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: responsiveScale(46),
  },
  searchSection: {
    width: "100%",
    alignSelf: "stretch",
    marginBottom: responsiveScale(46),
  },
  mapSection: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    marginBottom: responsiveMargin(8),
  },
  fieldLabel: {
    ...Typography.agLabel16,
    alignSelf: "flex-start",
    textAlign: "left",
    width: "100%",
    marginBottom: responsiveMargin(10),
  },
  resultsContainer: {
    paddingTop: responsivePadding(10),
    paddingBottom: responsivePadding(24),
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
  },
  noResultsText: {
    textAlign: "center",
    marginTop: responsiveMargin(20),
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-Regular",
    color: "grey",
    paddingHorizontal: responsivePadding(16),
  },
  helperText: {
    marginTop: responsiveMargin(10),
    textAlign: "center",
    color: "grey",
    fontSize: responsiveFontSize(14, 11),
    fontFamily: "Inter-Regular",
    lineHeight: responsiveScale(20, 16),
  },
  mapCta: {
    alignSelf: "center",
    width: responsiveScale(140),
    height: responsiveScale(52),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(26),
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mapCtaLabel: {
    fontFamily: "Outfit_300Light",
    fontSize: responsiveFontSize(16, 16),
    fontWeight: "400",
    letterSpacing: 0,
    color: primaryWhite,
    textAlign: "center",
  },
});
