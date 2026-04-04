import AsyncStorage from "@react-native-async-storage/async-storage";

const appSurfaceKey = (userId: string) => `lastAppSurface:${userId}`;
const professionKey = (userId: string) => `lastProfessionCode:${userId}`;

export type LastAppSurface = "client" | "professional";

export async function getLastAppSurface(
  userId: string
): Promise<LastAppSurface | null> {
  const raw = await AsyncStorage.getItem(appSurfaceKey(userId));
  return raw === "client" || raw === "professional" ? raw : null;
}

export async function setLastAppSurface(
  userId: string,
  surface: LastAppSurface
): Promise<void> {
  await AsyncStorage.setItem(appSurfaceKey(userId), surface);
}

export async function getLastProfessionCode(
  userId: string
): Promise<string | null> {
  return AsyncStorage.getItem(professionKey(userId));
}

export async function setLastProfessionCode(
  userId: string,
  code: string
): Promise<void> {
  await AsyncStorage.setItem(professionKey(userId), code);
}
