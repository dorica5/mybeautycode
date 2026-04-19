/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-hooks/rules-of-hooks */
import { Tabs, router, usePathname } from "expo-router";
import { House, Bell, User, MagnifyingGlass } from "phosphor-react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import { fetchNotifications } from "@/src/providers/useNotifcations";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";

const TAB_BAR_LAVENDER = "#F5F5FF";

const TAB_BAR_DEFAULT = {
  backgroundColor: primaryGreen,
  borderTopColor: "rgba(33, 36, 39, 0.12)",
  borderTopWidth: 1,
} as const;

const TAB_BAR_NOTIFICATIONS = {
  backgroundColor: TAB_BAR_LAVENDER,
  borderTopColor: "rgba(33, 36, 39, 0.1)",
  borderTopWidth: 1,
} as const;

function isClientNotificationsPath(path: string | undefined): boolean {
  if (!path) return false;
  return (
    path === "/notifications" ||
    path.includes("/(tabs)/notifications") ||
    /\/notifications\/?$/.test(path)
  );
}

/**
 * `usePathname()` can return short leaf paths (e.g. `/userList`) or grouped
 * paths (`/(client)/(tabs)/userList`). Tab handlers must treat both as the
 * same tab, or every press calls `router.replace` and confuses the root
 * navigator (NAVIGATE to `userList` not handled).
 */
function isActiveClientTab(
  pathname: string | undefined,
  segment: "home" | "notifications" | "userList" | "profile"
): boolean {
  if (!pathname) return false;
  const short = `/${segment}`;
  const full = `/(client)/(tabs)/${segment}`;
  return (
    pathname === short ||
    pathname === full ||
    pathname.startsWith(`${short}/`) ||
    pathname.startsWith(`${full}/`)
  );
}

const _layout = () => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Fetch unread notifications
  const loadUnreadNotifications = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const notifications = await fetchNotifications(profile.id);
      const count = notifications.filter(
        (n) => !(n as { read?: boolean }).read
      ).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread notifications:", error);
    }
  }, [profile?.id]);

  // Fetch unread count on mount and listen for real-time updates
  useEffect(() => {
    loadUnreadNotifications();

    const interval = setInterval(loadUnreadNotifications, 2000); // Refresh every 2s

    return () => clearInterval(interval);
  }, [loadUnreadNotifications]);

  const homeTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const href = "/(client)/(tabs)/home";
      if (isActiveClientTab(pathname, "home")) return;
      router.replace(href);
    },
    [pathname]
  );

  const notificationsTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const href = "/notifications";
      if (isActiveClientTab(pathname, "notifications")) return;
      router.replace(href);
    },
    [pathname]
  );

  const userListTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const href = "/(client)/(tabs)/userList";
      if (isActiveClientTab(pathname, "userList")) return;
      router.replace({ pathname: href, params: { fromTab: "1" } });
    },
    [pathname]
  );

  const profileTabPress = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      const href = "/(client)/(tabs)/profile";
      if (isActiveClientTab(pathname, "profile")) return;
      router.replace(href);
    },
    [pathname]
  );
  const screenOptions = useMemo(
    () => ({
      tabBarShowLabel: false,
      headerShown: false,
      lazy: false,
      unmountOnBlur: false,
      tabBarActiveTintColor: primaryBlack,
      tabBarInactiveTintColor: "#5d7168",
      tabBarStyle: isClientNotificationsPath(pathname)
        ? TAB_BAR_NOTIFICATIONS
        : TAB_BAR_DEFAULT,
    }),
    [pathname]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          href: "/(client)/(tabs)/home",
          tabBarIcon: ({ focused }) => {
            return <House size={32} weight={focused ? "fill" : "regular"} />;
          },
        }}
        listeners={{
          tabPress: homeTabPress,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <View>
              <Bell size={32} color={color} weight={focused ? "fill" : "regular"} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: notificationsTabPress,
        }}
      />
      <Tabs.Screen
        name="userList"
        options={{
          href: "/(client)/(tabs)/userList",
          tabBarIcon: ({ focused, color }) => (
            <MagnifyingGlass
              size={32}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
          ),
        }}
        listeners={{
          tabPress: userListTabPress,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }) => {
            return (
              <User size={32} color={color} weight={focused ? "fill" : "regular"} />
            );
          },
        }}
        listeners={{
          tabPress: profileTabPress,
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