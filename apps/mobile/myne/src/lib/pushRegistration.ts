import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export function getEasProjectId(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === "string" && fromExtra.trim()) {
    return fromExtra.trim();
  }
  const easConfig = Constants.easConfig as { projectId?: string } | undefined;
  if (typeof easConfig?.projectId === "string" && easConfig.projectId.trim()) {
    return easConfig.projectId.trim();
  }
  return null;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === "granted";
}

export async function getExpoPushTokenSafe(): Promise<Notifications.ExpoPushToken | null> {
  if (!Device.isDevice) {
    console.warn("[push] Push tokens require a physical device.");
    return null;
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn(
      "[push] Missing EAS projectId in app config — rebuild the dev client after linking mybeautycode."
    );
    return null;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) {
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      "[push] Could not get Expo push token. On iOS upload APNs key to EAS; on Android upload FCM V1 key.",
      message
    );
    return null;
  }
}
