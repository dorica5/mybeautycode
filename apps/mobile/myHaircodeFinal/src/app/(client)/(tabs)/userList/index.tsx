import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import SearchInput from "@/src/components/SearchInput";
import SearchResults from "@/src/components/SearchResults";
import { useListAllHairdresserSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { StatusBar } from "expo-status-bar";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Typography } from "@/src/constants/Typography";
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

/** `Organic-pattern-5.svg` viewBox — spiral proportions as in design. */
const ORGANIC_LOGO_VIEWBOX_W = 390;
const ORGANIC_LOGO_VIEWBOX_H = 226;

type Profession = "hair" | "nails" | "brows";

const CHIPS: { key: Profession; label: string }[] = [
  { key: "hair", label: "Hair" },
  { key: "nails", label: "Nails" },
  { key: "brows", label: "Brows" },
];

const FindProfessionalsScreen = () => {
  const { fromTab } = useLocalSearchParams<{ fromTab?: string }>();
  const hideBack = fromTab === "1";

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [selected, setSelected] = useState<Set<Profession>>(new Set());

  const { profile } = useAuth();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const { data: searchResults = [], isLoading } = useListAllHairdresserSearch(
    debouncedQuery,
    profile?.id
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      if (isFocused) {
        setSearchQuery("");
        setDebouncedQuery("");
        setDisplayedResults([]);
        setSelected(new Set());
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

  const handleSearch = (query: string) => setSearchQuery(query);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setDisplayedResults([]);
  }, []);

  const toggleChip = useCallback((key: Profession) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const presetForMap = useMemo(() => {
    if (selected.size !== 1) return undefined;
    return Array.from(selected)[0];
  }, [selected]);

  const goToFilterBeforeMap = useCallback(() => {
    router.push({
      pathname: "/(client)/(tabs)/userList/filter-before-map",
      params: presetForMap ? { preset: presetForMap } : {},
    });
  }, [presetForMap]);

  const spiralWidth = responsiveScale(200);
  const spiralHeight =
    spiralWidth * (ORGANIC_LOGO_VIEWBOX_H / ORGANIC_LOGO_VIEWBOX_W);

  return (
    <>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            {!hideBack ? (
              <Pressable
                onPress={() => router.back()}
                style={styles.backRow}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <CaretLeft size={responsiveScale(24)} color={primaryBlack} />
                <Text style={styles.backLabel}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}

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
                <View style={styles.headerBlock}>
                  <View style={styles.topCenter}>
                    <View style={styles.logoWrap}>
                      <OrganicPattern width={spiralWidth} height={spiralHeight} />
                    </View>
                    <Text style={[Typography.h3, styles.title]}>
                      Find professionals
                    </Text>

                    <View style={styles.chipsRow}>
                      {CHIPS.map(({ key, label }) => {
                        const on = selected.has(key);
                        return (
                          <Pressable
                            key={key}
                            onPress={() => toggleChip(key)}
                            style={[styles.chip, on && styles.chipSelected]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                          >
                          <Text style={[styles.chipLabel, on && styles.chipLabelSelected]}>
                            {label}
                          </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.searchSection}>
                    <Text style={styles.fieldLabel}>
                      Search for specific professional
                    </Text>
                    <SearchInput
                      variant="whitePill"
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
                      onPress={goToFilterBeforeMap}
                      style={styles.mapCta}
                      textStyle={styles.mapCtaLabel}
                    />
                  </View>
                </View>
              }
              renderItem={({ item }) => (
                <SearchResults
                  item={item}
                  context="client"
                  query={debouncedQuery}
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
                        Seems like your hairdresser hasn&apos;t started using
                        myHaircode yet. Tip them about it so they&apos;re here
                        next time you search!
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(8),
    alignSelf: "flex-start",
  },
  backPlaceholder: {
    height: responsiveScale(40),
  },
  backLabel: {
    ...Typography.bodyMedium,
    marginLeft: responsivePadding(4),
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
  logoWrap: {
    marginBottom: responsiveMargin(16),
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: responsiveScale(46),
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: responsivePadding(10),
    marginBottom: responsiveScale(46),
    paddingHorizontal: responsivePadding(4),
  },
  chip: {
    width: responsiveScale(52),
    height: responsiveScale(26),
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryBlack,
  },
  chipLabel: {
    fontFamily: "Outfit_300Light",
    fontSize: responsiveFontSize(14, 14),
    fontWeight: "400",
    letterSpacing: 0,
    color: primaryBlack,
    textAlign: "center",
  },
  chipLabelSelected: {
    color: primaryWhite,
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
