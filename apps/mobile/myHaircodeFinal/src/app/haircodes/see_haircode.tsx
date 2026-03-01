import { StyleSheet, FlatList, Text, View } from "react-native";
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import HaircodeCard from "@/src/components/HaircodeCard";
import TopNavGallery from "@/src/components/TopNavGallery";
import { useListClientHaircodes } from "@/src/api/haircodes";
import { Colors } from "@/src/constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { usePrefetchVisibleHaircodes } from "@/src/api/haircodes";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { 
  scalePercent,
  responsiveFontSize
} from "@/src/utils/responsive";

const SeeHaircode = () => {
  const { profile } = useAuth();
  const { id, phone_number, full_name, relationship } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [visibleHaircodeIds, setVisibleHaircodeIds] = useState([]);

  usePrefetchVisibleHaircodes(visibleHaircodeIds);

  const isRelated = relationship === "true";
  const { data, error, isLoading } = useListClientHaircodes(
    Array.isArray(id) ? id[0] : id
  );

  const normalizedPhoneNumber = Array.isArray(phone_number)
    ? phone_number[0]
    : phone_number;

  const number = normalizedPhoneNumber.startsWith("+47")
    ? normalizedPhoneNumber
    : `+47${normalizedPhoneNumber}`;

  const formatDate = (createdAt) => {
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
          <TopNavGallery
            title={Array.isArray(full_name) ? full_name.join(", ") : full_name}
            secondTitle={Array.isArray(number) ? number.join(", ") : number}
          />

          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 20 }}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {isLoading ? "Loading haircodes..." : "No haircodes added yet"}
              </Text>
            )}
            renderItem={({ item }) => {
              return (
                <HaircodeCard
                  name={item.hairdresser_name}
                  date={formatDate(item.created_at)}
                  profilePicture={item.hairdresser_profile.avatar_url}
                  salon_name={item.hairdresser_profile.salon_name}
                  onPress={() => {
                    router.push({
                      pathname: "./single_haircode",
                      params: {
                        haircodeId: item.id,
                        hairdresserName: item.hairdresser_name,
                        hairdresser_profile_pic:
                          item.hairdresser_profile.avatar_url,
                        description: item.service_description,
                        services: item.services,
                        createdAt: formatDate(item.created_at),
                        salon_name: item.hairdresser_profile.salon_name,
                        full_name,
                        number,
                        salonPhoneNumber:
                          item.hairdresser_profile.salon_phone_number,
                        about_me: item.hairdresser_profile.about_me,
                        booking_site: item.hairdresser_profile.booking_site,
                        social_media: item.hairdresser_profile.social_media,
                        price: item.price,
                        duration: item.duration,
                        relationship,
                        this_hairdresser: profile.id,
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

export default SeeHaircode;

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