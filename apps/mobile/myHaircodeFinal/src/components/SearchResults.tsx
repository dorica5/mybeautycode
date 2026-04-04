import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { Link } from "expo-router";
import { ResponsiveText } from "./ResponsiveText";
import { AvatarWithSpinner } from "./avatarSpinner";
import { 
  responsiveScale, 
  responsivePadding, 
  responsiveMargin,
  responsiveFontSize,
  scalePercent 
} from "../utils/responsive";

type SearchResultProps = {
  item: {
    id: string;
    hairdresser_id?: string;
    client_id?: string;
    full_name: string;
    avatar_url: string | null;
    phone_number: string;
    relationship_exists?: boolean;
    has_relationship?: boolean;
  };
  context?: string;
  query?: string;
};

const SearchResults = ({ item, context, query }: SearchResultProps) => {
  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return <Text style={styles.resultText}>{text}</Text>;

    const queryTrimmed = query.toLowerCase().trim();
    
    // Handle multi-word queries (like "emma d" or "emma darcy")
    if (queryTrimmed.includes(' ')) {
      const textLower = text.toLowerCase();
      if (textLower.startsWith(queryTrimmed)) {
        const match = text.slice(0, queryTrimmed.length);
        const after = text.slice(queryTrimmed.length);
        
        return (
          <Text style={styles.resultText}>
            <ResponsiveText weight="Bold" size={18} tabletSize={16}>{match}</ResponsiveText>
            {after}
          </Text>
        );
      }
      return <Text style={styles.resultText}>{text}</Text>;
    }
    
    // Single word: find which name part starts with the query
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
      
      // Add 1 for the space between parts
      currentIndex += part.length + 1;
    }

    if (matchedPartIndex === -1) {
      return <Text style={styles.resultText}>{text}</Text>;
    }

    const before = text.slice(0, matchStartIndex);
    const match = text.slice(matchStartIndex, matchEndIndex);
    const after = text.slice(matchEndIndex);

    return (
      <Text style={styles.resultText}>
        {before}
        <ResponsiveText weight="Bold" size={18} tabletSize={16}>{match}</ResponsiveText>
        {after}
      </Text>
    );
  };

  const hasRelationship = item.relationship_exists ?? item.has_relationship;
  const href =
    context === "hairdresser"
      ? hasRelationship
        ? `/haircodes/${item.client_id}`
        : `/(hairdresser)/clientProfile/${item.client_id}`
      : `/(client)/(tabs)/userList/professionalProfile/${item.hairdresser_id}`;

  return (
    <Link
      href={{
        pathname: href,
        params: {
          full_name: item.full_name,
          phone_number: item.phone_number,
          relationship: hasRelationship,
          client_id: item.client_id,
        },
      }}
      style={styles.resultItem}
      asChild
    >
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
        <AvatarWithSpinner
          uri={item.avatar_url}
          size={responsiveScale(50)}
          style={styles.profilePicture}
        />
        {highlightMatch(item.full_name, query)}
      </Pressable>
    </Link>
  );
};

export default SearchResults;

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(16),
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
    marginHorizontal: responsivePadding(16),
    width: scalePercent(93),
    alignSelf: 'center',
  },
  profilePicture: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    marginRight: responsiveMargin(20),
    justifyContent: "center",
    alignItems: "center",
  },
  resultText: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Regular",
    flexShrink: 1,
    flexWrap: "wrap",
  },
});