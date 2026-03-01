import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/providers/AuthProvider";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { NotificationItem } from "@/src/components/NotificationItem";
import { fetchNotifications } from "@/src/providers/useNotifcations";
import {
  moderateScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/src/constants/Colors";

const Notifications = () => {
  const { profile } = useAuth();
  const [groupedNotifications, setGroupedNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Other";
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return "Today";
      if (isYesterday(date)) return "Yesterday";
      return format(date, "MMMM d, yyyy");
    } catch {
      return "Other";
    }
  };

  const groupByDate = (notifications: { created_at?: string; createdAt?: string }[]) => {
    const grouped = notifications.reduce((acc, notification) => {
      const dateKey = formatDate(notification.created_at ?? notification.createdAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(notification);
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, items]) => ({ date, items }));
  };

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    try {
      const notifications = await fetchNotifications(profile.id);
      setGroupedNotifications(groupByDate(notifications));
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const renderGroup = ({ item }) => (
    <View style= {{backgroundColor:"transparent"}}>
      <Text style={styles.dateText}>{item.date}</Text>
      {item.items.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </View>
  );

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Notifications</Text>
          <FlatList
            data={groupedNotifications}
            renderItem={renderGroup}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={
              <Text style={styles.noNotificationsText}>
                No notifications available
              </Text>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={loadNotifications}
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
    backgroundColor: "#fff",
  },
  title: {
    marginVertical: scalePercent(10),
    textAlign: "center",
    fontFamily: "Inter-SemiBold",
    fontSize: moderateScale(24),
  },
  contentContainer: {
    paddingVertical: scale(5),
  },
  dateText: {
    marginTop: verticalScale(20),
    fontSize: moderateScale(14),
    fontFamily: "Inter-SemiBold",
    marginHorizontal: scalePercent(5),
    marginBottom: verticalScale(10),
  },
  noNotificationsText: {
    textAlign: "center",
    fontFamily: "Inter-Regular",
    marginTop: verticalScale(20),
    fontSize: moderateScale(18),
    color: Colors.dark.warmGreen,
  },
});

export default Notifications;
