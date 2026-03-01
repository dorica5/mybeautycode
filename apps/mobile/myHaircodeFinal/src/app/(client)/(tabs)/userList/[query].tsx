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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import SearchInput from "@/src/components/SearchInput";
import SearchResults from "@/src/components/SearchResults";
import { useListAllHairdresserSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { StatusBar } from "expo-status-bar";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";

const SearchHairdresserPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [displayedResults, setDisplayedResults] = useState([]);
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
      }
    });

    return unsubscribe;
  }, [navigation]);

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
                onSearch={handleSearch}
                initialQuery={searchQuery}
                placeholder="Search for hairdressers"
                clearSearch={clearSearch}
              />

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
                        No results found for "{debouncedQuery}"
                      </Text>

                      {/* Detect national chains like "Cutters" */}
                      {["cutters", "nikita", "sayso", "fredrik & louisa", "dada hårstudio"].some(
                        (chain) => debouncedQuery.toLowerCase().includes(chain)
                      ) ? (
                        <Text style={styles.helperText}>
                          This app is for individual hairdressers, not salon
                          chains like {debouncedQuery}.
                        </Text>
                      ) : (
                        <Text style={styles.helperText}>
                          Seems like your hairdresser hasn’t started using
                          myHaircode yet. Tip them about it so they’re here next
                          time you search!
                        </Text>
                      )}
                    </View>
                  ) : null
                }
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
});
