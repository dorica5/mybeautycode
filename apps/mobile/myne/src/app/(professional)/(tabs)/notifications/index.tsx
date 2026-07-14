import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/providers/AuthProvider";
import { isToday, isYesterday, parseISO } from "date-fns";
import {
  NotificationItem,
  type NotificationItemProps,
} from "@/src/components/NotificationItem";
import { fetchNotifications } from "@/src/providers/useNotifcations";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import ThemedRouteLoading from "@/src/components/ThemedRouteLoading";
import { StatusBar } from "expo-status-bar";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import {
  formatVisitListDateForLocale,
  useI18n,
} from "@/src/providers/LanguageProvider";
import type { AppLocale } from "@/src/i18n";

type NotifRow = {
  created_at?: string;
  createdAt?: string;
  id: string;
  type?: string;
  status?: string | null;
  data?: Record<string, unknown> | null;
};

type DateBucket = "today" | "yesterday" | "other" | string;

type Grouped = { bucket: DateBucket; items: NotifRow[] };

function dateBucket(
  dateString: string | undefined,
  locale: AppLocale
): DateBucket {
  if (!dateString) return "other";
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return "today";
    if (isYesterday(date)) return "yesterday";
    return formatVisitListDateForLocale(locale, dateString);
  } catch {
    return "other";
  }
}

function bucketLabel(
  bucket: DateBucket,
  t: (key: string) => string
): string {
  if (bucket === "today") return t("common.today");
  if (bucket === "yesterday") return t("common.yesterday");
  if (bucket === "other") return t("common.other");
  return bucket;
}

function groupByDate(
  notifications: NotifRow[],
  locale: AppLocale
): Grouped[] {
  const grouped = notifications.reduce<Record<string, NotifRow[]>>(
    (acc, notification) => {
      const key = dateBucket(
        notification.created_at ?? notification.createdAt,
        locale
      );
      if (!acc[key]) acc[key] = [];
      acc[key].push(notification);
      return acc;
    },
    {}
  );

  return Object.entries(grouped).map(([bucket, items]) => ({
    bucket: bucket as DateBucket,
    items,
  }));
}

function sortGroups(groups: Grouped[]): Grouped[] {
  const rank = (b: DateBucket) => {
    if (b === "today") return 0;
    if (b === "yesterday") return 1;
    if (b === "other") return 2;
    return 3;
  };
  return [...groups].sort((a, b) => {
    const ra = rank(a.bucket);
    const rb = rank(b.bucket);
    if (ra !== rb) return ra - rb;
    if (typeof a.bucket === "string" && typeof b.bucket === "string") {
      return a.bucket.localeCompare(b.bucket);
    }
    return 0;
  });
}

const Notifications = () => {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const { activeProfessionCode, storedProfessionReady } =
    useActiveProfessionState(profile);
  const [groupedNotifications, setGroupedNotifications] = useState<Grouped[]>(
    []
  );
  const [refreshing, setRefreshing] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [loadedLane, setLoadedLane] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  // Pro inbox: show only notifications for the currently active profession
  // account. Switching lanes (hair <-> nails) shows a different inbox.
  const loadNotifications = useCallback(
    async (fromUserPull: boolean) => {
      if (!profile?.id) return;
      if (!storedProfessionReady || !activeProfessionCode) {
        setGroupedNotifications([]);
        setLoadedLane(null);
        setInboxLoading(false);
        return;
      }

      const lane = activeProfessionCode;
      const generation = ++loadGenerationRef.current;
      if (!fromUserPull) {
        setInboxLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const notifications = (await fetchNotifications(
          profile.id,
          lane
        )) as NotifRow[];
        if (generation !== loadGenerationRef.current) return;

        const visible = notifications.filter((n) => {
          const type = String(n.type ?? "");
          const s = String(n.status ?? (n.data as any)?.status ?? "");
          const isLinkRequest = type === "FRIEND_REQUEST" || type === "link_request";
          return !(isLinkRequest && s === "rejected");
        });
        setGroupedNotifications(sortGroups(groupByDate(visible, locale)));
        setLoadedLane(lane);
      } catch (error) {
        if (generation !== loadGenerationRef.current) return;
        console.error("Error loading notifications:", error);
      } finally {
        if (generation === loadGenerationRef.current) {
          if (fromUserPull) setRefreshing(false);
          else setInboxLoading(false);
        }
      }
    },
    [profile?.id, activeProfessionCode, storedProfessionReady, locale]
  );

  useEffect(() => {
    setGroupedNotifications([]);
    setLoadedLane(null);
    setInboxLoading(true);
  }, [activeProfessionCode]);

  useEffect(() => {
    void loadNotifications(false);
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications(false);
    }, [loadNotifications])
  );

  const inboxReady =
    storedProfessionReady &&
    Boolean(activeProfessionCode) &&
    !inboxLoading &&
    loadedLane === activeProfessionCode;

  const renderGroup = ({ item }: { item: Grouped }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{bucketLabel(item.bucket, t)}</Text>
      {item.items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification as NotificationItemProps["notification"]}
          cardTone="light"
        />
      ))}
    </View>
  );

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topSpacer} />
        <Text style={[Typography.h3, styles.title]} accessibilityRole="header">
          {t("notifications.title")}
        </Text>
        {!inboxReady ? (
          <ThemedRouteLoading accessibilityLabel={t("notifications.title")} />
        ) : (
          <FlatList
            key={activeProfessionCode ?? "pro-inbox"}
            data={groupedNotifications}
            renderItem={renderGroup}
            keyExtractor={(g) => String(g.bucket)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications(true)}
                tintColor={primaryBlack}
                colors={Platform.OS === "android" ? [primaryBlack] : undefined}
              />
            }
          />
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  topSpacer: {
    height: responsiveScale(40),
  },
  title: {
    textAlign: "center",
    marginBottom: responsiveScale(46),
    paddingHorizontal: responsivePadding(20),
  },
  listContent: {
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsiveMargin(24),
  },
  section: {
    marginBottom: responsiveMargin(8),
  },
  sectionTitle: {
    ...Typography.agLabel16,
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    marginTop: responsiveMargin(4),
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: "center",
    marginTop: responsiveMargin(32),
    color: primaryBlack,
    opacity: 0.45,
  },
});

export default Notifications;
