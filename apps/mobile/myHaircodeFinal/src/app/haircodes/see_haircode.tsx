import {
  StyleSheet,
  FlatList,
  Text,
  View,
  Pressable,
} from "react-native";
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import TopNavGallery from "@/src/components/TopNavGallery";
import {
  prefetchHaircodeWithMedia,
  useListClientHaircodes,
  usePrefetchVisibleHaircodes,
} from "@/src/api/haircodes";
import { useAuth } from "@/src/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { CaretRight } from "phosphor-react-native";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

type ClientHaircodeRow = {
  id: string;
  created_at: string;
  hairdresser_name?: string | null;
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
  preview_media_url?: string | null;
  preview_media_type?: string | null;
};

const SeeHaircode = () => {
  const { profile } = useAuth();
  const {
    id,
    phone_number,
    full_name,
    relationship,
    professionCode: professionCodeParam,
  } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [visibleHaircodeIds, setVisibleHaircodeIds] = useState<string[]>([]);

  usePrefetchVisibleHaircodes(visibleHaircodeIds);

  const clientId = Array.isArray(id) ? id[0] : id;
  const rawProfession = Array.isArray(professionCodeParam)
    ? professionCodeParam[0]
    : professionCodeParam;
  const professionCode =
    typeof rawProfession === "string" && rawProfession.trim()
      ? rawProfession.trim()
      : "hair";

  const { data, isLoading } = useListClientHaircodes(
    clientId ?? "",
    professionCode
  );

  const normalizedPhoneNumber =
    (Array.isArray(phone_number) ? phone_number[0] : phone_number) ?? "";
  const displayPhone =
    normalizedPhoneNumber && !normalizedPhoneNumber.startsWith("+")
      ? `+47${normalizedPhoneNumber}`
      : normalizedPhoneNumber;

  const displayClientName =
    (Array.isArray(full_name) ? full_name.join(" ") : full_name)?.trim() ||
    "Client";

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
          <TopNavGallery
            title={displayClientName}
            secondTitle={displayPhone}
          />

          <FlatList
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
                item.hairdresser_profile ??
                item.professional_profile ??
                null;
              const proAvatarUrl =
                hp?.avatar_url ?? profile?.avatar_url ?? undefined;

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.visitCard,
                    pressed && styles.visitCardPressed,
                  ]}
                  onPressIn={() => prefetchHaircodeWithMedia(queryClient, item.id)}
                  onPress={() => {
                    void prefetchHaircodeWithMedia(queryClient, item.id);
                    router.push({
                      pathname: "/haircodes/single_haircode",
                      params: {
                        haircodeId: item.id,
                        hairdresserName: item.hairdresser_name ?? "",
                        hairdresser_profile_pic: hp?.avatar_url ?? "",
                        description: item.service_description ?? "",
                        services: item.services ?? "",
                        createdAt: formatVisitDate(item.created_at),
                        salon_name: hp?.salon_name ?? "",
                        full_name: displayClientName,
                        number: displayPhone,
                        salonPhoneNumber: hp?.salon_phone_number ?? "",
                        about_me: hp?.about_me ?? "",
                        booking_site: hp?.booking_site ?? "",
                        social_media: hp?.social_media ?? "",
                        price: item.price ?? "",
                        duration: item.duration ?? "",
                        relationship: relationship as string,
                        this_hairdresser: profile?.id ?? "",
                      },
                    });
                  }}
                >
                  <View style={styles.thumbWrap}>
                    <AvatarWithSpinner
                      uri={proAvatarUrl}
                      size={AVATAR_SIZE}
                      style={styles.avatar}
                    />
                  </View>
                  <View style={styles.textCol}>
                    <Text
                      style={[Typography.anton16Medium, styles.dateLine]}
                      numberOfLines={1}
                    >
                      {formatVisitDate(item.created_at)}
                    </Text>
                    <Text
                      style={Typography.bodyMedium}
                      numberOfLines={2}
                    >
                      {displayClientName}
                    </Text>
                  </View>
                  <CaretRight
                    size={responsiveScale(22)}
                    color={primaryBlack}
                    style={styles.chevron}
                  />
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </>
  );
};

export default SeeHaircode;

/** Pro (hairdresser) avatar — matches taller row cards. */
const AVATAR_SIZE = responsiveScale(64);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  listContent: {
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsivePadding(32),
  },
  visitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    minHeight: responsiveScale(108),
    paddingVertical: responsivePadding(20),
    paddingHorizontal: responsivePadding(18),
    marginBottom: responsiveMargin(14),
  },
  visitCardPressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    marginRight: responsiveMargin(16),
  },
  avatar: {
    borderWidth: 1,
    borderColor: `${primaryBlack}33`,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  dateLine: {
    marginBottom: responsiveMargin(6),
  },
  chevron: {
    marginLeft: responsiveMargin(8),
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
