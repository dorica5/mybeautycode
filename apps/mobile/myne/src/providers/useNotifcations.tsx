import { useState, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import { getExpoPushTokenSafe } from "@/src/lib/pushRegistration";

export interface PushNotification {
  notification: Notifications.Notification;
  expoPushToken: Notifications.ExpoPushToken;
}

const ACCESS_TOKEN_RETRY_MS = 400;
const ACCESS_TOKEN_MAX_ATTEMPTS = 8;

/** Session can lag behind AuthProvider state right after sign-up / permission dialogs. */
async function resolveAccessToken(
  hint?: string
): Promise<string | undefined> {
  if (hint?.trim()) return hint.trim();

  for (let attempt = 0; attempt < ACCESS_TOKEN_MAX_ATTEMPTS; attempt++) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;

    if (attempt === 2 || attempt === 5) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (!error && refreshed.session?.access_token) {
        return refreshed.session.access_token;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, ACCESS_TOKEN_RETRY_MS));
  }

  return undefined;
}

export const saveTokenToDatabase = async (
  token: Notifications.ExpoPushToken,
  _userId: string,
  accessTokenHint?: string
) => {
  if (!token?.data) return;

  let hint = accessTokenHint;
  for (let attempt = 0; attempt < ACCESS_TOKEN_MAX_ATTEMPTS; attempt++) {
    const accessToken = await resolveAccessToken(hint);
    if (!accessToken) {
      await new Promise((resolve) => setTimeout(resolve, ACCESS_TOKEN_RETRY_MS));
      hint = undefined;
      continue;
    }

    try {
      await api.post(
        "/api/notifications/push-token",
        { token: token.data },
        { accessToken }
      );
      return;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401 && attempt < ACCESS_TOKEN_MAX_ATTEMPTS - 1) {
        await supabase.auth.refreshSession();
        hint = undefined;
        await new Promise((resolve) => setTimeout(resolve, ACCESS_TOKEN_RETRY_MS));
        continue;
      }
      console.error("Error saving push token:", error);
      return;
    }
  }

  console.error("Error saving push token: no auth session");
};

export const registerForPushNotificationAsync = async (
  userId: string,
  accessTokenHint?: string
) => {
  if (!userId) return null;

  const token = await getExpoPushTokenSafe();
  if (!token) return null;

  await saveTokenToDatabase(token, userId, accessTokenHint);
  return token;
};

/**
 * `professionCode`:
 *   - `null` / `undefined` -> client inbox (default)
 *   - `"hair"` / `"nails"` / `"brows"` -> pro's profession-account inbox
 */
export const sendPushNotification = async (
  recipientId: string,
  userId: string,
  type: string,
  message: string,
  extraData: Record<string, unknown> = {},
  title = "Good News",
  professionCode?: string | null
) => {
  const code =
    typeof professionCode === "string" && professionCode.trim()
      ? coerceProfessionCode(professionCode.trim()) ?? professionCode.trim()
      : null;
  try {
    await api.post("/api/notifications/send", {
      recipient_id: recipientId,
      type,
      message,
      title,
      extra_data: extraData,
      ...(code ? { profession_code: code } : {}),
    });
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
  }
};

/**
 * `inbox`:
 *   - `undefined` -> return everything (legacy / global count)
 *   - `null`      -> only client-inbox notifications (for the client tab shell)
 *   - string      -> only that profession-account inbox
 */
export const fetchNotifications = async (
  _userId: string,
  inbox?: string | null
) => {
  try {
    const params = new URLSearchParams();
    if (inbox === null) {
      params.set("profession_code", "client");
    } else if (typeof inbox === "string" && inbox.trim()) {
      const lane =
        coerceProfessionCode(inbox.trim()) ?? inbox.trim();
      params.set("profession_code", lane);
    }
    const qs = params.toString();
    const data = await api.get<unknown[]>(
      qs ? `/api/notifications?${qs}` : "/api/notifications"
    );
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
    const userId = session?.user?.id;
    const accessToken = session?.access_token;
    if (!userId || !accessToken) return;

    console.log("Registering push notifications for user:", userId);
    registerForPushNotificationAsync(userId, accessToken)
      .then((token) => {
        if (token) {
          console.log("Successfully registered token:", token);
          setExpoPushToken(token);
        }
      })
      .catch((error) => {
        console.error("Failed to register for push notifications:", error);
      });
  }, [session?.user?.id, session?.access_token]);

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