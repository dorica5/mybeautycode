/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Tabs, router, usePathname } from "expo-router";
import { House, Bell, Images, User } from "phosphor-react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import { fetchNotifications } from "@/src/providers/useNotifcations";

const _layout = () => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const loadUnreadNotifications = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const notifications = await fetchNotifications(profile.id);
      const count = notifications.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread notifications:", error);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadUnreadNotifications();

    const interval = setInterval(loadUnreadNotifications, 2000);

    return () => clearInterval(interval);
  }, [loadUnreadNotifications]);

  const handleTabPress = (href, tabName) => {
    return (e) => {
      e.preventDefault();

      if (pathname === href) {
        return;
      }

      router.replace(href);
    };
  };
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        lazy: true,
        unmountOnBlur: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: "/home",
          tabBarIcon: ({ focused }) => (
            <House size={32} weight={focused ? "fill" : "regular"} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress("/home", "home"),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <Bell size={32} weight={focused ? "fill" : "regular"} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: handleTabPress("/notifications", "notifications"),
        }}
      />
      <Tabs.Screen
        name="myInspiration"
        options={{
          href: "/inspiration",
          tabBarIcon: ({ focused }) => (
            <Images size={32} weight={focused ? "fill" : "regular"} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress("/inspiration", "inspiration"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <User size={32} weight={focused ? "fill" : "regular"} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress("/(hairdresser)/(tabs)/profile", "profile"),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  notificationBadge: {
    position: "absolute",
    right: -6,
    top: -2,
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter-Bold",
  },
});

export default _layout;
