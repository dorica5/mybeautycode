import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/providers/AuthProvider";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  NotificationItem,
  type NotificationCardTone,
  type NotificationItemProps,
} from "@/src/components/NotificationItem";
import { fetchNotifications } from "@/src/providers/useNotifcations";
import { StatusBar } from "expo-status-bar";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

type NotifRow = {
  created_at?: string;
  createdAt?: string;
  id: string;
  type?: string;
  status?: string | null;
  data?: Record<string, unknown> | null;
};

type Grouped = { date: string; items: NotifRow[] };

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "Other";
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  } catch {
    return "Other";
  }
}

function groupByDate(notifications: NotifRow[]): Grouped[] {
  const grouped = notifications.reduce<Record<string, NotifRow[]>>(
    (acc, notification) => {
      const dateKey = formatDate(
        notification.created_at ?? notification.createdAt
      );
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(notification);
      return acc;
    },
    {}
  );

  return Object.entries(grouped).map(([date, items]) => ({ date, items }));
}

function sortGroups(groups: Grouped[]): Grouped[] {
  const rank = (d: string) => {
    if (d === "Today") return 0;
    if (d === "Yesterday") return 1;
    return 2;
  };
  return [...groups].sort((a, b) => {
    const ra = rank(a.date);
    const rb = rank(b.date);
    if (ra !== rb) return ra - rb;
    return a.date.localeCompare(b.date);
  });
}

function toneForSection(date: string): NotificationCardTone {
  return date === "Today" ? "light" : "dark";
}

const Notifications = () => {
  const { profile } = useAuth();
  const [groupedNotifications, setGroupedNotifications] = useState<Grouped[]>(
    []
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(
    async (fromUserPull: boolean) => {
      if (!profile?.id) return;
      if (fromUserPull) setRefreshing(true);
      try {
        const notifications = (await fetchNotifications(
          profile.id
        )) as NotifRow[];
        const visible = notifications.filter((n) => {
          const t = String(n.type ?? "");
          const s = String(n.status ?? (n.data as any)?.status ?? "");
          const isLinkRequest = t === "FRIEND_REQUEST" || t === "link_request";
          return !(isLinkRequest && s === "rejected");
        });
        setGroupedNotifications(sortGroups(groupByDate(visible)));
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        if (fromUserPull) setRefreshing(false);
      }
    },
    [profile?.id]
  );

  useEffect(() => {
    void loadNotifications(false);

    const interval = setInterval(() => loadNotifications(false), 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const renderGroup = ({ item }: { item: Grouped }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{item.date}</Text>
      {item.items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification as NotificationItemProps["notification"]}
          cardTone={toneForSection(item.date)}
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
          Notifications
        </Text>
        <FlatList
          data={groupedNotifications}
          renderItem={renderGroup}
          keyExtractor={(g) => g.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications yet</Text>
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
