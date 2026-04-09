import { StyleSheet, FlatList, Text, View } from "react-native";
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import HaircodeCard from "@/src/components/HaircodeCard";
import TopNav from "@/src/components/TopNav";
import {
  prefetchHaircodeWithMedia,
  useListClientHaircodes,
  usePrefetchVisibleHaircodes,
} from "@/src/api/haircodes";
import { Colors } from "@/src/constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { 
  scalePercent,
  responsiveFontSize,
  verticalScale
} from "@/src/utils/responsive";

const SeeHaircodeClient = () => {
  const { profile } = useAuth();
  const clientId = profile?.id ?? (profile as { id?: string })?.id;
  const { data, error, isLoading } = useListClientHaircodes(clientId ?? "");
  const queryClient = useQueryClient();

  const [visibleHaircodeIds, setVisibleHaircodeIds] = useState([]);

  usePrefetchVisibleHaircodes(visibleHaircodeIds);

  const formatDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const visibleIds = viewableItems.map((item) => item.item.id);
    setVisibleHaircodeIds(visibleIds);
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
      const topHaircodeIds = data.slice(0, 5).map((item) => item.id);
      import("@/src/api/haircodes").then((module) => {
        module.prefetchHaircodeMedia(topHaircodeIds, queryClient);
      });
    }
  }, [data]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <TopNav title="My haircodes" />

          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 20 }}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {error ? "Failed to load haircodes" : isLoading ? "Loading haircodes..." : "No haircodes added yet"}
              </Text>
            )}
            renderItem={({ item }) => {
              const hp =
                item.hairdresser_profile ?? item.professional_profile ?? {};
              return (
              <HaircodeCard
                name={item.hairdresser_name}
                date={formatDate(item.created_at)}
                profilePicture={hp.avatar_url}
                salon_name={hp.salon_name}
                onPressIn={() => prefetchHaircodeWithMedia(queryClient, item.id)}
                onPress={() => {
                  void prefetchHaircodeWithMedia(queryClient, item.id);
                  router.push({
                    pathname: "./single_haircode_client",
                    params: {
                      haircodeId: item.id,
                      hairdresserName: item.hairdresser_name,
                      salon_name: hp.salon_name ?? "",
                      hairdresser_profile_pic: hp.avatar_url ?? "",
                      services: item.services ?? [],
                      createdAt: formatDate(item.created_at),
                      salonPhoneNumber: hp.salon_phone_number ?? "",
                      about_me: hp.about_me ?? "",
                      booking_site: hp.booking_site ?? "",
                      social_media: hp.social_media ?? "",
                      duration: item.duration ?? "",
                      hairdresser_id: item.hairdresser_id ?? "",
                    },
                  });
                }}
              />
            );}}
            contentContainerStyle={{ paddingBottom: verticalScale(20) }}
          />
        </SafeAreaView>
      </View>
    </>
  );
};

export default SeeHaircodeClient;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: scalePercent(1),
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  save: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-SemiBold",
  },
  emptyText: {
    textAlign: "center",
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-SemiBold",
    marginTop: "50%",
    color: Colors.dark.warmGreen,
  },
});
