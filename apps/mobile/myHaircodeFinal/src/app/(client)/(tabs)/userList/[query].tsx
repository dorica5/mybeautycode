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
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import SearchInput from "@/src/components/SearchInput";
import SearchResults from "@/src/components/SearchResults";
import { useListAllHairdresserSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { StatusBar } from "expo-status-bar";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import { primaryBlack } from "@/src/constants/Colors";

const SearchHairdresserPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const { profile } = useAuth();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const {
    data: searchResults = [],
    isFetching,
    isError,
    error,
    refetch,
  } = useListAllHairdresserSearch(debouncedQuery, profile?.id);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      if (isFocused) {
        setSearchQuery("");
        setDebouncedQuery("");
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

  const handleSearch = useCallback(
    (query: string) => setSearchQuery(query),
    []
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const listEmpty = () => {
    if (!debouncedQuery) return null;
    if (isFetching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={primaryBlack} style={{ marginTop: 24 }} />
        </View>
      );
    }
    if (isError) {
      const msg =
        error instanceof Error ? error.message : "Could not reach the server.";
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{msg}</Text>
          <Text style={styles.errorHint}>
            If the API runs on your machine, set EXPO_PUBLIC_API_URL to your
            computer LAN IP (not localhost) and restart Expo with -c.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry search"
          >
            <Text style={styles.retryBtnLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
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
        ].some((chain) => debouncedQuery.toLowerCase().includes(chain)) ? (
          <Text style={styles.helperText}>
            This app is for individual hairdressers, not salon chains like{" "}
            {debouncedQuery}.
          </Text>
        ) : (
          <Text style={styles.helperText}>
            {`Seems like your hairdresser hasn't started using ${BRAND_DISPLAY_NAME} yet. Tip them about it so they're here next time you search!`}
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.viewContainer}>
              <ResponsiveText
                size={20}
                tabletSize={16}
                weight="SemiBold"
                style={styles.title}
              >
                Find my hairdresser
              </ResponsiveText>

              <SearchInput
                value={searchQuery}
                onSearch={handleSearch}
                initialQuery={searchQuery}
                placeholder="Search for hairdressers"
                clearSearch={clearSearch}
              />

              <FlatList
                data={debouncedQuery ? searchResults : []}
                keyExtractor={(item, index) =>
                  `${item.hairdresser_id}_${index}`
                }
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                initialNumToRender={10}
                renderItem={({ item }) => (
                  <SearchResults
                    item={item}
                    context="client"
                    query={debouncedQuery}
                  />
                )}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={styles.resultsContainer}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </>
  );
};

export default SearchHairdresserPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  resultsContainer: {
    paddingTop: responsivePadding(10),
    paddingBottom: responsivePadding(20),
  },
  viewContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  title: {
    textAlign: "center",
    marginVertical: responsiveMargin(20),
    paddingHorizontal: responsivePadding(16),
  },
  noResultsText: {
    textAlign: "center",
    marginTop: responsiveMargin(20),
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-Regular",
    color: "grey",
    paddingHorizontal: responsivePadding(16),
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
  errorText: {
    textAlign: "center",
    marginTop: responsiveMargin(16),
    fontSize: responsiveFontSize(15, 12),
    fontFamily: "Inter-Regular",
    color: primaryBlack,
    paddingHorizontal: responsivePadding(12),
  },
  errorHint: {
    marginTop: responsiveMargin(10),
    textAlign: "center",
    fontSize: responsiveFontSize(13, 11),
    color: "grey",
    lineHeight: responsiveScale(20, 16),
    paddingHorizontal: responsivePadding(12),
  },
  retryBtn: {
    marginTop: responsiveMargin(16),
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryBtnLabel: {
    fontSize: responsiveFontSize(15, 12),
    fontFamily: "Inter-SemiBold",
    color: primaryBlack,
  },
});
