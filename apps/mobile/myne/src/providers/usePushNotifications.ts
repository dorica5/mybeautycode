/* import { useState, useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from 'expo-constants';
import { Platform } from "react-native";
import { supabase } from "@/src/lib/supabase";

export interface PushNotification {
  notification: Notifications.Notification;
  expoPushToken: Notifications.ExpoPushToken;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [allNotifications, setAllNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return undefined;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notifications!");
        return undefined;
      }

      // Get the token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      // Store token in Supabase
      if (token) {
        const { error } = await supabase.from("push_tokens").upsert({ 
          token,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Error storing push token:', error);
        }
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return undefined;
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    registerForPushNotifications().then(setExpoPushToken);
    fetchNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        fetchNotifications(); // Refresh notifications when new one arrives
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notificationId = response.notification.request.content.data?.id;
        if (notificationId) {
          markNotificationAsRead(notificationId);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    allNotifications,
    loading,
    markNotificationAsRead,
    fetchNotifications,
  };
};
  */