import { StyleSheet, FlatList, Text, View } from "react-native";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import {
  prefetchHaircodeWithMedia,
  useListClientHaircodes,
  usePrefetchVisibleHaircodes,
} from "@/src/api/visits";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import {
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveScale,
} from "@/src/utils/responsive";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { VisitTimelineCard } from "@/src/components/visits/VisitTimelineCard";

type ClientHaircodeRow = {
  id: string;
  created_at: string;
  hairdresser_name?: string | null;
  hairdresser_id?: string | null;
  service_description?: string | null;
  services?: string | null;
  price?: string | null;
  duration?: string | null;
  hairdresser_profile?: {
    avatar_url?: string | null;
    salon_name?: string | null;
    salon_phone_number?: string | null;
    about_me?: string | null;
    booking_site?: string | null;
    social_media?: string | null;
  } | null;
  professional_profile?: ClientHaircodeRow["hairdresser_profile"];
};

/**
 * Client “My visits” — sage screen, profile-style title below back, VisitTimelineCard rows.
 */
const SeeVisitsClient = () => {
  const { profile } = useAuth();
  const clientId = profile?.id ?? "";
  const queryClient = useQueryClient();

  const { data, isLoading } = useListClientHaircodes(clientId);

  const [visibleHaircodeIds, setVisibleHaircodeIds] = useState<string[]>([]);

  usePrefetchVisibleHaircodes(visibleHaircodeIds);

  const displayClientName = useMemo(() => {
    const fromParts = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromParts.length > 0) return fromParts;
    return profile?.full_name?.trim() || "Client";
  }, [profile?.first_name, profile?.last_name, profile?.full_name]);

  const normalizedPhoneNumber = profile?.phone_number?.trim() ?? "";

  const formatVisitDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: { id: string } }[] }) => {
      const visibleIds = viewableItems.map((v) => v.item.id);
      setVisibleHaircodeIds(visibleIds);
    },
    []
  );

  useEffect(() => {
    const list = data as ClientHaircodeRow[] | undefined;
    if (list && list.length > 0) {
      const topHaircodeIds = list.slice(0, 12).map((item) => item.id);
      for (const id of topHaircodeIds) {
        void prefetchHaircodeWithMedia(queryClient, id);
      }
    }
  }, [data, queryClient]);

  const listData = (data as ClientHaircodeRow[] | undefined) ?? [];

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <View style={styles.headerBlock}>
            <View style={navBackChromeStyles.screenBar}>
              <NavBackRow onPress={() => router.back()} />
            </View>
            <Text style={styles.screenTitle} accessibilityRole="header">
              My visits
            </Text>
          </View>

          <FlatList
            style={styles.list}
            data={listData}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 20 }}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {isLoading ? "Loading visits…" : "No visits yet"}
              </Text>
            )}
            renderItem={({ item }) => {
              const hp =
                item.hairdresser_profile ?? item.professional_profile ?? null;
              const proAvatarUrl = hp?.avatar_url ?? undefined;

              return (
                <VisitTimelineCard
                  avatarUri={proAvatarUrl}
                  dateLine={formatVisitDate(item.created_at)}
                  subtitleLine={displayClientName}
                  onPressIn={() => prefetchHaircodeWithMedia(queryClient, item.id)}
                  onPress={() => {
                    void prefetchHaircodeWithMedia(queryClient, item.id);
                    router.push({
                      pathname: "/visits/single_visit_client",
                      params: {
                        haircodeId: item.id,
                        hairdresserName: item.hairdresser_name ?? "",
                        hairdresser_profile_pic: hp?.avatar_url ?? "",
                        description: item.service_description ?? "",
                        services:
                          item.services == null
                            ? ""
                            : typeof item.services === "string"
                              ? item.services
                              : JSON.stringify(item.services),
                        createdAt: formatVisitDate(item.created_at),
                        salon_name: hp?.salon_name ?? "",
                        full_name: displayClientName,
                        number: normalizedPhoneNumber,
                        salonPhoneNumber: hp?.salon_phone_number ?? "",
                        about_me: hp?.about_me ?? "",
                        booking_site: hp?.booking_site ?? "",
                        social_media: hp?.social_media ?? "",
                        price: item.price ?? "",
                        duration: item.duration ?? "",
                        hairdresser_id: item.hairdresser_id ?? "",
                      },
                    });
                  }}
                />
              );
            }}
          />
        </SafeAreaView>
      </View>
    </>
  );
};

export default SeeVisitsClient;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  headerBlock: {
    paddingBottom: responsivePadding(8),
  },
  /** Same as client profile `myProfileTitle` — title sits below the back row, not inline. */
  screenTitle: {
    ...Typography.h3,
    textAlign: "center",
    marginTop: responsiveScale(20, 16),
    color: primaryBlack,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsivePadding(32),
  },
  emptyText: {
    textAlign: "center",
    marginTop: responsiveMargin(48),
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-Medium",
    color: primaryBlack,
    opacity: 0.75,
  },
});
