import { KeyboardAvoidingView, Platform } from "react-native";

import { Colors } from "@constants/Colors";
import { UserCircle } from "phosphor-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import RemoteImage from "@/src/components/RemoteImage";
import React, { useState, useEffect, useCallback } from "react";
import {
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
import { useImageContext } from "@/src/providers/ImageProvider";
import { useLatestHaircodes } from "@/src/api/haircodes";
import HaircodeCard from "@/src/components/HaircodeCard";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  responsiveValue,
  widthPercent,
  heightPercent,
  isTablet,
  getBreakpoint,
  contextualScale,
  // Legacy compatibility - gradually migrate away from these
  moderateScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const HomeScreen = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();
  useFocusEffect(
    useCallback(() => {
      console.log("IN HAIRDRESSER HOME");
    }, [])
  );
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [showSearchUI, setShowSearchUI] = useState(false);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    data: searchResults = [],
    isLoading,
    error,
  } = useListAllClientSearch(debouncedQuery, profile?.id);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) {
        setShowSearchUI(true);
      } else {
        setShowSearchUI(false);
        setDisplayedResults([]);
        setIsTransitioning(false);
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
      setIsTransitioning(false);
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
    isLoading: isLoadingHaircodes,
    error: haircodesError,
  } = useLatestHaircodes(profile?.id);

  const filteredHaircodes =
    latestHaircodes?.filter((item) => {
      if (!item?.created_at) return false;
      const createdAt = new Date(item.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdAt >= sevenDaysAgo;
    }) ?? [];

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView
            style={styles.container}
            edges={["top", "right", "left"]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.topNav}>
                {profile ? (
                  avatarImage ? (
                    <AvatarWithSpinner
                      uri={avatarImage}
                      style={styles.profilePic}
                    />
                  ) : (
                    <View style={styles.profilePic}>
                      <UserCircle
                        size={responsiveScale(32)}
                        color={Colors.dark.dark}
                      />
                    </View>
                  )
                ) : (
                  <UserCircle
                    size={responsiveScale(32)}
                    color={Colors.dark.dark}
                  />
                )}
                <Text style={styles.userName}> {profile?.full_name} </Text>
              </View>

              <SearchInput
                onSearch={handleSearch}
                initialQuery={searchQuery}
                placeholder="Search for clients"
              />

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
                    {latestHaircodes?.length > 0 && (
                      <Text style={styles.text}>Latest haircodes</Text>
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
                                hairdresser_profile_pic: profile.avatar_url,
                                salon_name: profile.salon_name,
                                salonPhoneNumber: profile.salon_phone_number,
                                about_me: profile.about_me,
                                booking_site: profile.booking_site,
                                social_media: profile.social_media,
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
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: responsiveScale(16),
    paddingHorizontal: responsivePadding(16),
    marginTop: responsiveScale(20),
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    width: responsiveScale(70),
    aspectRatio: 1,
    borderRadius: responsiveScale(35),
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    marginLeft: responsiveMargin(16),
    fontSize: responsiveFontSize(25, 20),
    fontFamily: "Inter-Regular",
    textAlign: "left",
  },
  contentContainer: {
    flex: 1,
    minHeight: responsiveScale(300),
  },
  text: {
    fontSize: responsiveFontSize(15, 14),
    left: responsivePadding(20),
    fontFamily: "Inter-Semibold",
    margin: responsiveMargin(10),
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
});
