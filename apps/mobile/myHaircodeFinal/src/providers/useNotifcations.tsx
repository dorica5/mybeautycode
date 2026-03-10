import { useState, useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";

export interface PushNotification {
  notification: Notifications.Notification;
  expoPushToken: Notifications.ExpoPushToken;
}

export const saveTokenToDatabase = async (
  token: Notifications.ExpoPushToken,
  _userId: string
) => {
  if (!token?.data) return;
  try {
    await api.post("/api/notifications/push-token", { token: token.data });
  } catch (error) {
    console.error("Error saving push token:", error);
  }
};

export const registerForPushNotificationAsync = async (userId: string) => {
  console.log("STARTING registration for user:", userId);
  
  try {
    if (!userId) {
      console.log("No userId provided");
      return;
    }

    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("Existing notification permission status:", existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("Permission request result:", status);
    }

    if (finalStatus !== "granted") {
      console.log("Permission denied");
      Alert.alert("Failed to get push token for push notifications!");
      return;
    }

    console.log("Getting Expo push token with projectId:", Constants.expoConfig?.extra?.eas?.projectId);
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    console.log("Got Expo push token:", token);
    
    // Save token to database
    await saveTokenToDatabase(token, userId);

    if (Platform.OS === "android") {
      console.log("Setting up Android notification channel");
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    throw error;
  }
};

export const sendPushNotification = async (
  recipientId: string,
  userId: string,
  type: string,
  message: string,
  extraData: Record<string, unknown> = {},
  title = "Good News"
) => {
  try {
    await api.post("/api/notifications/send", {
      recipient_id: recipientId,
      type,
      message,
      title,
      extra_data: extraData,
    });
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
  }
};

export const fetchNotifications = async (_userId: string) => {
  try {
    const data = await api.get<unknown[]>("/api/notifications");
    return data ?? [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await api.put(`/api/notifications/${notificationId}/read`);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// The hook itself - can be used independently or with passed session
export const useNotifications = (passedSession?: any) => {
  // Get session internally or use passed session
  const [internalSession, setInternalSession] = useState<any>(null);
  const session = passedSession || internalSession;
  
  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Initialize notification handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  // Get session if not passed
  useEffect(() => {
    if (!passedSession) {
      console.log("No session passed to useNotifications, getting session directly");
      const getSession = async () => {
        const { data } = await supabase.auth.getSession();
        setInternalSession(data.session);
      };
      
      getSession();
      
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setInternalSession(newSession);
        }
      );
      
      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, [passedSession]);

  // Register for push notifications if we have a session
  useEffect(() => {
    if (session?.user?.id) {
      console.log("Registering push notifications for user:", session.user.id);
      registerForPushNotificationAsync(session.user.id)
        .then(token => {
          if (token) {
            console.log("Successfully registered token:", token);
            setExpoPushToken(token);
          }
        })
        .catch(error => {
          console.error("Failed to register for push notifications:", error);
        });
    }
  }, [session?.user?.id]);

  // Set up notification listeners
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Received notification:", notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response received:", response);
      const notificationId = response.notification.request.content.data?.notificationId;
      if (notificationId) {
        markNotificationAsRead(notificationId);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Fetch notifications when session changes
  useEffect(() => {
    if (session?.user?.id) {
      setLoading(true);
      fetchNotifications(session.user.id)
        .then(notifications => {
          setAllNotifications(notifications as any);
        })
        .catch(error => {
          console.error("Error fetching notifications:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [session?.user?.id]);

  return {
    expoPushToken,
    notification,
    allNotifications,
    loading,
  };
};