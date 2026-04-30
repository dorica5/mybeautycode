import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import React, { useState } from "react";
import { Link, router, type Href } from "expo-router";
import { ResponsiveText } from "./ResponsiveText";
import { AvatarWithSpinner } from "./avatarSpinner";
import { AddClientRowIcon, PendingClockRowIcon } from "./AddClientRowIcon";
import { FONT_FAMILY, Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { requestClientLink } from "@/src/api/profiles";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  scalePercent,
} from "../utils/responsive";
import { isUuid } from "../utils/isUuid";

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
    link_pending?: boolean;
  };
  context?: string;
  query?: string;
  /** Active professional lane — required for `/visits/[id]` relationship checks. */
  professionCode?: string | null;
};

const SearchResults = ({ item, context, query, professionCode }: SearchResultProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [actionBusyClientId, setActionBusyClientId] = useState<string | null>(null);

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
    if (queryTrimmed.length === 0) {
      return <Text style={baseNameStyle}>{text}</Text>;
    }

    const textLower = text.toLowerCase();

    const boldSpan = (match: string) =>
      isProClientRow ? (
        <Text style={boldNameStyle}>{match}</Text>
      ) : (
        <ResponsiveText weight="Bold" size={18} tabletSize={16}>
          {match}
        </ResponsiveText>
      );

    /** Case-insensitive substring matches anywhere in the name (e.g. "Ma" in "Amanda" and "Manda"). */
    const fragments: React.ReactNode[] = [];
    let last = 0;
    let matchAt = textLower.indexOf(queryTrimmed, last);

    while (matchAt !== -1) {
      if (matchAt > last) {
        fragments.push(text.slice(last, matchAt));
      }
      const end = matchAt + queryTrimmed.length;
      fragments.push(boldSpan(text.slice(matchAt, end)));
      last = end;
      matchAt = textLower.indexOf(queryTrimmed, last);
    }

    if (fragments.length === 0) {
      return <Text style={baseNameStyle}>{text}</Text>;
    }
    if (last < text.length) {
      fragments.push(text.slice(last));
    }

    return (
      <Text style={baseNameStyle}>
        {fragments.map((node, i) => (
          <React.Fragment key={`nm-${i}`}>
            {node}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  const hasRelationship = item.relationship_exists ?? item.has_relationship;
  const linkPending = Boolean(item.link_pending);

  const displayName =
    item.full_name?.trim() || item.phone_number || "Client";

  if (isProClientRow) {
    const clientId = item.client_id ?? item.id;
    const hairdresserId = profile?.id;
    const laneReady = Boolean(professionCode?.trim());
    const showQuickLinkActions =
      Boolean(hairdresserId) && laneReady && isUuid(clientId);
    /** Trailing add / pending only — no icon once the client has approved (active). */
    const showTrailingSlot = showQuickLinkActions && !hasRelationship;
    const trailingIconDp = responsiveScale(24);

    const invalidateAfterLinkChange = async () => {
      await queryClient.invalidateQueries({ queryKey: ["clientSearch"] });
      await queryClient.invalidateQueries({ queryKey: ["latest_visits"] });
    };

    const navigateToClient = () => {
      if (!isUuid(clientId)) return;
      if (hasRelationship) {
        router.push({
          pathname: "/visits/[id]" as Href,
          params: {
            id: clientId,
            full_name: item.full_name,
            phone_number: item.phone_number,
            relationship: String(hasRelationship),
            client_id: clientId,
            ...(professionCode?.trim()
              ? { professionCode: professionCode.trim() }
              : {}),
          },
        });
        return;
      }
      router.push({
        pathname: "/(professional)/clientProfile/[id]" as Href,
        params: {
          id: clientId,
          full_name: item.full_name,
          phone_number: item.phone_number,
          relationship: "false",
          client_id: clientId,
        },
      });
    };

    const navigateToPendingClientProfile = () => {
      if (!isUuid(clientId)) return;
      router.push({
        pathname: "/(professional)/clientProfile/[id]" as Href,
        params: {
          id: clientId,
          full_name: item.full_name,
          phone_number: item.phone_number,
          relationship: "false",
          client_id: clientId,
        },
      });
    };

    const rowActionBusy = actionBusyClientId === clientId;

    return (
      <View style={styles.resultItemPro}>
        <Pressable
          style={({ pressed }) => [
            styles.pressableProMain,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={navigateToClient}
        >
          <AvatarWithSpinner
            uri={item.avatar_url}
            size={responsiveScale(48)}
            style={[styles.profilePicture, styles.profilePicturePro]}
          />
          <View style={styles.nameColumn}>
            {highlightMatch(displayName, query ?? "")}
          </View>
        </Pressable>
        {showTrailingSlot ? (
          linkPending ? (
            <Pressable
              style={({ pressed }) => [
                styles.plusWrap,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              onPress={navigateToPendingClientProfile}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Request pending, open client profile"
            >
              <PendingClockRowIcon
                size={trailingIconDp}
                color={primaryBlack}
              />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.plusWrap,
                { opacity: pressed && !rowActionBusy ? 0.5 : 1 },
              ]}
              onPress={async () => {
                if (rowActionBusy || !laneReady || !isUuid(clientId)) return;
                setActionBusyClientId(clientId);
                try {
                  await requestClientLink(clientId, professionCode);
                  await invalidateAfterLinkChange();
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not send the request.";
                  Alert.alert("Request failed", msg);
                } finally {
                  setActionBusyClientId(null);
                }
              }}
              disabled={rowActionBusy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Add client"
            >
              {rowActionBusy ? (
                <ActivityIndicator color={primaryBlack} />
              ) : (
                <AddClientRowIcon
                  size={trailingIconDp}
                  color={primaryBlack}
                />
              )}
            </Pressable>
          )
        ) : null}
      </View>
    );
  }

  const href = `/(client)/(tabs)/userList/professionalProfile/${item.hairdresser_id}`;

  const rowContent = (
    <>
      <AvatarWithSpinner
        uri={item.avatar_url}
        size={responsiveScale(50)}
        style={styles.profilePicture}
      />
      <View style={styles.nameColumn}>
        {highlightMatch(displayName, query ?? "")}
      </View>
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
          ...(professionCode?.trim()
            ? { profession: professionCode.trim() }
            : {}),
        },
      }}
      style={styles.resultItem}
      asChild
    >
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
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
  pressableProMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
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
    minWidth: responsiveScale(36),
    minHeight: responsiveScale(36),
  },
  resultText: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Regular",
    flexShrink: 1,
    flexWrap: "wrap",
  },
});
