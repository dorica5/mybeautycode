import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import MyButton from "@/src/components/MyButton";
import {
  fetchRecentProfiles as fetchRecentProfilesApi,
  searchShareProfiles as searchShareProfilesApi,
} from "@/src/api/relationships/share";
import { useMark } from "@/src/providers/MarkProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { CheckCircle, Circle, UserCircle } from "phosphor-react-native";
import { Colors } from "@/src/constants/Colors";
import RemoteImage from "@/src/components/RemoteImage";
import SearchInput from "@/src/components/SearchInput";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius
} from "@/src/utils/responsive";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const ShareInspirationModal = ({ onClose }) => {
  const { selectedImages, handleShare } = useMark();
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const { profile } = useAuth();
  const [buttonPressed, setButtonPressed] = useState(false);
  const [loading, setLoading] = useState(false);

  const userType = useMemo(() => profile?.user_type, [profile?.user_type]);
  const profileId = useMemo(() => profile?.id, [profile?.id]);

  const searchNamesByStartOfParts = useCallback((data, query) => {
    if (!query || !query.trim()) return data;
    
    const queryTrimmed = query.toLowerCase().trim();
    
    return data.filter(person => {
      const fullNameLower = person.full_name.toLowerCase();
      const nameParts = fullNameLower.split(/\s+/);
      
      if (queryTrimmed.includes(' ')) {
        return fullNameLower.startsWith(queryTrimmed);
      } else {
        return nameParts.some(part => part.startsWith(queryTrimmed));
      }
    });
  }, []);

  const highlightMatch = useCallback((text, query) => {
    if (!query || !query.trim()) return <Text style={styles.fullName}>{text}</Text>;

    const queryTrimmed = query.toLowerCase().trim();
    
    if (queryTrimmed.includes(' ')) {
      const textLower = text.toLowerCase();
      if (textLower.startsWith(queryTrimmed)) {
        const match = text.slice(0, queryTrimmed.length);
        const after = text.slice(queryTrimmed.length);
        
        return (
          <Text style={styles.fullName}>
            <Text style={styles.highlightedText}>{match}</Text>
            {after}
          </Text>
        );
      }
      return <Text style={styles.fullName}>{text}</Text>;
    }
    
    const nameParts = text.split(/\s+/);
    let matchedPartIndex = -1;
    let matchStartIndex = -1;
    let matchEndIndex = -1;
    
    let currentIndex = 0;
    for (let i = 0; i < nameParts.length; i++) {
      const part = nameParts[i];
      const partLower = part.toLowerCase();
      
      if (partLower.startsWith(queryTrimmed)) {
        matchedPartIndex = i;
        matchStartIndex = currentIndex;
        matchEndIndex = currentIndex + queryTrimmed.length;
        break;
      }
      
      currentIndex += part.length + 1;
    }

    if (matchedPartIndex === -1) {
      return <Text style={styles.fullName}>{text}</Text>;
    }

    const before = text.slice(0, matchStartIndex);
    const match = text.slice(matchStartIndex, matchEndIndex);
    const after = text.slice(matchEndIndex);

    return (
      <Text style={styles.fullName}>
        {before}
        <Text style={styles.highlightedText}>{match}</Text>
        {after}
      </Text>
    );
  }, []);

  const fetchRecentProfiles = useCallback(async () => {
    if (!profileId || !userType) return;
    setLoading(true);
    try {
      const profiles = await fetchRecentProfilesApi(profileId, userType);
      setRecentProfiles(profiles);
    } catch (error) {
      console.error("Error fetching recent profiles:", error);
      setRecentProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, userType]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecentProfiles();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentProfiles]);

  useEffect(() => {
    fetchRecentProfiles();
  }, [fetchRecentProfiles]);

  const searchProfiles = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (!profileId || !userType) return;
    try {
      const results = await searchShareProfilesApi(profileId, userType, query);
      const filtered = searchNamesByStartOfParts(results, query);
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error during search:", error);
      setSearchResults([]);
    }
  }, [profileId, userType, searchNamesByStartOfParts]);

  const handleSelectRecipient = useCallback((recipient) => {
    setSelectedRecipients((prev) =>
      prev.find((r) => r.id === recipient.id)
        ? prev.filter((r) => r.id !== recipient.id)
        : [...prev, recipient]
    );
  }, []);

  const handleConfirmShare = async () => {
    if (!selectedRecipients.length || !selectedImages.length) {
      Alert.alert("Error", "Please select recipients and images.");
      return;
    }

    setButtonPressed(true);
    try {
      for (const recipient of selectedRecipients) {
        await handleShare(recipient.id);
      }
      onClose();
    } catch (error) {
      console.error("Error sharing inspiration:", error);
      Alert.alert("Error", "Failed to share inspiration.");
    } finally {
      setButtonPressed(false);
    }
  };

  const renderRecentItem = ({ item }) => {
  const isSelected = selectedRecipients.some((r) => r.id === item.id);
  return (
    <Pressable
      onPress={() => handleSelectRecipient(item)}
      style={[
        styles.recentItem,
        isSelected && styles.selectedOverlay,
      ]}
    >
      {item.avatar_url ? (
        <AvatarWithSpinner uri={item.avatar_url} size={responsiveScale(50)} style={styles.avatar} />
      ) : (
        <View style={styles.defaultImage}>
          <UserCircle
            size={responsiveScale(32)}
            color={Colors.dark.dark}
            weight="regular"
          />
        </View>
      )}
      <Text style={styles.recentItemName} numberOfLines={2}>
        {item.full_name}
      </Text>
    </Pressable>
  );
};

  const renderSearchItem = ({ item }) => {
    const isSelected = selectedRecipients.some((r) => r.id === item.id);
    return (
      <Pressable
        style={styles.hairdresserItem}
        onPress={() => handleSelectRecipient(item)}
      >
        {item.avatar_url ? (
          <AvatarWithSpinner uri={item.avatar_url} size={responsiveScale(50)} style={styles.avatar} />
        ) : (
          <View style={styles.defaultImage}>
            <UserCircle
              size={responsiveScale(32)}
              color={Colors.dark.dark}
              weight="regular"
            />
          </View>
        )}
        <View style={styles.nameContainer}>
          {highlightMatch(item.full_name, searchQuery)}
        </View>
        <View style={styles.checkCircle}>
          {isSelected ? (
            <CheckCircle size={responsiveScale(24)} color={Colors.dark.warmGreen} />
          ) : (
            <Circle size={responsiveScale(24)} color={"grey"} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? responsiveScale(100) : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inner}>
              <Text style={styles.title}>Share Inspiration</Text>

              <SearchInput
                onSearch={searchProfiles}
                initialQuery=""
                placeholder={`Search for ${
                  userType === "CLIENT" ? "hairdressers" : "clients"
                }`}
                style={styles.searchInput}
              />

              {!searchQuery && (
                <>
                  <Text style={styles.sectionHeader}>
                    {userType === "CLIENT"
                      ? "Recent Hairdressers"
                      : "Recent Clients"}
                  </Text>
                  {loading ? (
                    <Text style={styles.noResultsText}>Loading...</Text>
                  ) : (
                    <View style={styles.recentContainer}>
                      <FlatList
                        numColumns={3}
                        scrollEnabled={false}
                        data={recentProfiles}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.recentListContent}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderRecentItem}
                        ListEmptyComponent={() => (
                          <Text style={styles.noResultsText}>
                            No recent profiles found
                          </Text>
                        )}
                      />
                    </View>
                  )}
                </>
              )}

              {searchQuery && (
                <FlatList
                  scrollEnabled={false}
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={renderSearchItem}
                  ListEmptyComponent={
                    <Text style={styles.noResultsText}>
                      {searchResults.length === 0 && searchQuery.trim()
                        ? "No results found"
                        : null}
                    </Text>
                  }
                />
              )}
            </View>

            {selectedRecipients.length > 0 && selectedImages.length > 0 && (
              <View style={styles.buttonWrapperVertical}>
                <View style={styles.fullWidthButton}>
                  <MyButton
                    text={buttonPressed ? "Sharing..." : "Share"}
                    textSize={18}
                    textTabletSize={12}
                    onPress={handleConfirmShare}
                    disabled={buttonPressed}
                  />
                </View>
                <Pressable onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  recentItemName: {
    fontSize: responsiveFontSize(14, 10),
    textAlign: "center",
    marginTop: responsiveScale(4),
    paddingHorizontal: responsiveScale(1),
    lineHeight: responsiveFontSize(14, 12),
    width: '100%',
  },
  inner: {
    padding: 0,
    paddingBottom: Platform.OS === "ios" ? responsiveScale(100) : responsiveScale(80),
  },
  title: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Bold",
    marginTop: scalePercent(5),
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
    marginTop: responsiveScale(20),
    marginBottom: responsiveScale(10),
    marginLeft: responsiveScale(20),
  },
  recentContainer: {
    width: scalePercent(100),
    paddingHorizontal: responsiveScale(10),
  },
  recentListContent: {
    width: scalePercent(100),
    justifyContent: 'space-between',
  },
  recentItem: {
    flex: 1,
    alignItems: "center",
    padding: responsiveScale(8),
    maxWidth: scalePercent(30),
    minWidth: scalePercent(28),
  },
  selectedOverlay: {
    opacity: 0.6,
  },
  avatar: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
  },
  hairdresserItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveScale(10),
    paddingVertical: responsiveScale(10),
  },
  nameContainer: {
    flex: 1,
    marginLeft: scalePercent(5),
  },
  fullName: {
    fontSize: responsiveFontSize(14, 12),
    flex: 1,
    marginLeft: scalePercent(5),
    marginTop: responsiveScale(20),
    textAlign: "center",
  },
  highlightedText: {
    fontFamily: "Inter-Bold",
  },
  checkCircle: {
    marginRight: scalePercent(5),
  },
  defaultImage: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    textAlign: "center",
    fontSize: responsiveFontSize(14, 12),
    color: "grey",
    marginTop: responsiveScale(20),
  },
  buttonWrapperVertical: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsiveScale(20),
    paddingBottom: scalePercent(15),
    gap: responsiveScale(12),
  },
  fullWidthButton: {
    width: scalePercent(80),
  },
  cancelButton: {
    marginTop: responsiveScale(12),
    width: scalePercent(80),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveScale(12),
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    borderRadius: responsiveScale(30),
    backgroundColor: "transparent",
  },
  cancelText: {
    color: "red",
    fontSize: responsiveFontSize(16, 12),
  },
  searchInput: {
    alignSelf: "center",
    width: scalePercent(90),
  },
});

export default ShareInspirationModal;