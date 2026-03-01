import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { CaretLeft } from "phosphor-react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import { useListClientSearch } from "@/src/api/profiles";

const SearchPage = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const {
    data: searchResults,
    isLoading,
    error,
  } = useListClientSearch(debouncedQuery, profile?.id);

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

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <SearchResults item={item} />}
            contentContainerStyle={styles.resultsContainer}
          />
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
});
