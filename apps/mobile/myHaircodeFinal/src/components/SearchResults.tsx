import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { Link } from "expo-router";
import { ResponsiveText } from "./ResponsiveText";
import { AvatarWithSpinner } from "./avatarSpinner";
import { AddClientRowIcon } from "./AddClientRowIcon";
import { FONT_FAMILY, Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  scalePercent,
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
  const isProClientRow = context === "hairdresser";
  const baseNameStyle = isProClientRow
    ? Typography.bodySmall
    : styles.resultText;
  const boldNameStyle = isProClientRow
    ? [Typography.bodySmall, { fontFamily: FONT_FAMILY.outfitMedium }]
    : null;

  const highlightMatch = (text: string, q: string) => {
    if (!q || !q.trim()) {
      return <Text style={baseNameStyle}>{text}</Text>;
    }

    const queryTrimmed = q.toLowerCase().trim();

    const boldSpan = (match: string) =>
      isProClientRow ? (
        <Text style={boldNameStyle}>{match}</Text>
      ) : (
        <ResponsiveText weight="Bold" size={18} tabletSize={16}>
          {match}
        </ResponsiveText>
      );

    if (queryTrimmed.includes(" ")) {
      const textLower = text.toLowerCase();
      if (textLower.startsWith(queryTrimmed)) {
        const match = text.slice(0, queryTrimmed.length);
        const after = text.slice(queryTrimmed.length);
        return (
          <Text style={baseNameStyle}>
            {boldSpan(match)}
            {after}
          </Text>
        );
      }
      return <Text style={baseNameStyle}>{text}</Text>;
    }

    const nameParts = text.split(/\s+/);
    let matchStartIndex = -1;
    let matchEndIndex = -1;
    let currentIndex = 0;
    for (let i = 0; i < nameParts.length; i++) {
      const part = nameParts[i];
      const partLower = part.toLowerCase();
      if (partLower.startsWith(queryTrimmed)) {
        matchStartIndex = currentIndex;
        matchEndIndex = currentIndex + queryTrimmed.length;
        break;
      }
      currentIndex += part.length + 1;
    }

    if (matchStartIndex === -1) {
      return <Text style={baseNameStyle}>{text}</Text>;
    }

    const before = text.slice(0, matchStartIndex);
    const match = text.slice(matchStartIndex, matchEndIndex);
    const after = text.slice(matchEndIndex);

    return (
      <Text style={baseNameStyle}>
        {before}
        {boldSpan(match)}
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

  const displayName =
    item.full_name?.trim() ||
    item.phone_number ||
    "Client";

  const rowContent = (
    <>
      <AvatarWithSpinner
        uri={item.avatar_url}
        size={isProClientRow ? responsiveScale(48) : responsiveScale(50)}
        style={[
          styles.profilePicture,
          isProClientRow && styles.profilePicturePro,
        ]}
      />
      <View style={isProClientRow ? styles.nameColumn : undefined}>
        {highlightMatch(displayName, query ?? "")}
      </View>
      {isProClientRow && (
        <View style={styles.plusWrap} pointerEvents="none">
          <AddClientRowIcon
            size={responsiveScale(24)}
            color={primaryBlack}
          />
        </View>
      )}
    </>
  );

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
      style={isProClientRow ? styles.resultItemPro : styles.resultItem}
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          isProClientRow ? styles.pressablePro : null,
          { opacity: pressed ? 0.5 : 1 },
        ]}
      >
        {rowContent}
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
    alignSelf: "center",
  },
  resultItemPro: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: responsivePadding(12),
    paddingHorizontal: 0,
  },
  pressablePro: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  profilePicture: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    marginRight: responsiveMargin(20),
    justifyContent: "center",
    alignItems: "center",
  },
  profilePicturePro: {
    marginRight: responsiveMargin(14),
  },
  nameColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  plusWrap: {
    marginLeft: responsiveMargin(8),
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