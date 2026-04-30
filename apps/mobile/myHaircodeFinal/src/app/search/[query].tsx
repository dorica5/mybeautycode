import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import SearchInput from "@/src/components/SearchInput";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchResults from "@/src/components/SearchResults";
import { NavBackRow } from "@/src/components/NavBackRow";
import { useAuth } from "@/src/providers/AuthProvider";
import { useListAllClientSearch } from "@/src/api/profiles";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { primaryBlack } from "@/src/constants/Colors";

const SearchPage = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    storedProfessionReady,
    activeProfessionCode,
  } = useActiveProfessionState(profile);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const {
    data: searchResults = [],
    isFetching,
    isError,
    error,
    refetch,
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

  const q = debouncedQuery.trim();
  const hasQuery = q.length > 0;

  const waitingAuth = hasQuery && !profile?.id;

  const waitingLanePrefs =
    hasQuery && !!profile?.id && !storedProfessionReady;

  const needsProfessionLane =
    hasQuery &&
    !!profile?.id &&
    storedProfessionReady &&
    !activeProfessionCode;

  const canFetchClients =
    hasQuery &&
    !!profile?.id &&
    storedProfessionReady &&
    !!activeProfessionCode;

  let body: React.ReactNode;

  if (!hasQuery) {
    body = (
      <View style={styles.hintWrap}>
        <Text style={styles.hintText}>Type a name to search</Text>
      </View>
    );
  } else if (waitingAuth) {
    body = (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={primaryBlack} />
        <Text style={styles.statusHint}>Loading profile…</Text>
      </View>
    );
  } else if (waitingLanePrefs) {
    body = (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={primaryBlack} />
        <Text style={styles.statusHint}>Loading workspace…</Text>
      </View>
    );
  } else if (needsProfessionLane) {
    body = (
      <View style={styles.hintWrap}>
        <Text style={styles.statusHint}>
          Choose your professional account on the home screen, then search again.
        </Text>
      </View>
    );
  } else if (canFetchClients && isError) {
    const msg =
      error instanceof Error ? error.message : "Could not reach the server.";
    body = (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{msg}</Text>
        <Text style={styles.errorHint}>
          If the API runs on your machine, set EXPO_PUBLIC_API_URL to your
          computer LAN IP (not localhost) in .env and restart Expo with{" "}
          <Text style={styles.errorMono}>-c</Text>.
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
  } else if (canFetchClients && isFetching) {
    body = (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={primaryBlack} />
      </View>
    );
  } else {
    body = (
      <FlatList
        keyboardShouldPersistTaps="handled"
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
            professionCode={activeProfessionCode}
          />
        )}
        contentContainerStyle={styles.resultsContainer}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No results found</Text>
          </View>
        }
      />
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.viewContainer}>
          <View style={styles.backChrome}>
            <NavBackRow onPress={() => router.back()} accessibilityLabel="Go back" />
          </View>

          <View style={{ alignItems: "flex-start" }}>
            <Text style={styles.text}>Search for existing clients</Text>
          </View>

          <SearchInput onSearch={handleSearch} initialQuery={""} />

          {body}
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
  backChrome: {
    marginHorizontal: "7%",
    marginVertical: "6%",
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
  statusHint: {
    marginTop: 12,
    fontSize: 15,
    opacity: 0.85,
  },
  loadingWrap: {
    paddingTop: 24,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyWrap: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
  },
  errorWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  errorText: {
    fontSize: 15,
    color: primaryBlack,
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 13,
    opacity: 0.75,
    lineHeight: 20,
    marginBottom: 12,
  },
  errorMono: {
    fontFamily: "Courier",
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: primaryBlack,
    marginTop: 4,
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryBtnLabel: {
    fontSize: 15,
    fontFamily: "Inter-SemiBold",
    color: primaryBlack,
  },
});
