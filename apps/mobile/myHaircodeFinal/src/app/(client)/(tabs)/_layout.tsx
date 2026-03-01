/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-hooks/rules-of-hooks */
import { Tabs, router, usePathname } from "expo-router";
import { House, Bell, User, MagnifyingGlass } from "phosphor-react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import { fetchNotifications } from "@/src/providers/useNotifcations";

const _layout = () => {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Fetch unread notifications
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

  // Fetch unread count on mount and listen for real-time updates
  useEffect(() => {
    loadUnreadNotifications();

    const interval = setInterval(loadUnreadNotifications, 2000); // Refresh every 2s

    return () => clearInterval(interval);
  }, [loadUnreadNotifications]);

  // Memoize tab press handlers to prevent recreation on every render
  const homeTabPress = useCallback((e) => {
  e.preventDefault();
  const href = "/(client)/(tabs)/home";
  
  if (pathname === href) {
    return; 
  }
  
  router.replace(href);
}, [pathname]);

  const notificationsTabPress = useCallback((e) => {
  e.preventDefault();
  const href = "/notifications";
  
  if (pathname === href) {
    return; 
  }
  
  router.replace(href);
}, [pathname]);

  const userListTabPress = useCallback((e) => {
  e.preventDefault();
  const href = "/userList/hairdresserProfile";
  
  if (pathname === href) {
    return; 
  }
  
  router.replace(href);
}, [pathname]);

  const profileTabPress = useCallback((e) => {
  e.preventDefault();
  const href = "/(client)/(tabs)/profile";
  
  if (pathname === href) {
    return; 
  }
  
  router.replace(href);
}, [pathname]);
  // Memoize screen options to prevent recreation
  const screenOptions = useMemo(() => ({
    tabBarShowLabel: false,
    headerShown: false,
    lazy: true,
    unmountOnBlur: false,
  }), []);

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
          tabPress: notificationsTabPress,
        }}
      />
      <Tabs.Screen
        name="userList"
        options={{
          tabBarIcon: ({ focused }) => {
            return <MagnifyingGlass size={32} weight={focused ? "fill" : "regular"} />;
          },
        }}
        listeners={{
          tabPress: userListTabPress,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => {
            return <User size={32} weight={focused ? "fill" : "regular"} />;
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