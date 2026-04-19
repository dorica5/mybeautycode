import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { CaretLeft } from "phosphor-react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import { useListAllClientSearch } from "@/src/api/profiles";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { primaryBlack } from "@/src/constants/Colors";

const SearchPage = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeProfessionCode } = useActiveProfessionState(profile);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const {
    data: searchResults = [],
    isLoading,
  } = useListAllClientSearch(
    debouncedQuery,
    profile?.id,
    activeProfessionCode
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 600);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.viewContainer}>
          <Pressable
            onPress={() => router.back()}
            style={{ marginHorizontal: "7%", marginVertical: "6%" }}
          >
            <CaretLeft size={32} />
          </Pressable>

          <View style={{ alignItems: "flex-start" }}>
            <Text style={styles.text}>Search for existing clients</Text>
          </View>

          <SearchInput onSearch={handleSearch} initialQuery={""} />

          {debouncedQuery.trim().length === 0 ? (
            <View style={styles.hintWrap}>
              <Text style={styles.hintText}>Type a name to search</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={primaryBlack} />
            </View>
          ) : (
            <FlatList
              data={searchResults as never[]}
              keyExtractor={(item, index) => {
                const row = item as { client_id?: string; id?: string };
                return `${row.client_id ?? row.id ?? "row"}_${index}`;
              }}
              renderItem={({ item }) => (
                <SearchResults
                  item={item as never}
                  context="hairdresser"
                  query={debouncedQuery}
                />
              )}
              contentContainerStyle={styles.resultsContainer}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default SearchPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  viewContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  text: {
    marginTop: "0%",
    padding: "5%",
    fontSize: 15,
    fontFamily: "Regular",
    borderRadius: 20,
  },
  hintWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hintText: {
    fontSize: 15,
    opacity: 0.7,
  },
  loadingWrap: {
    paddingTop: 24,
    alignItems: "center",
  },
  emptyWrap: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
  },
});
