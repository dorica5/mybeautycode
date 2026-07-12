import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "@/src/constants/types";

const KEY = "profile_cache_v1";

type CachedProfile = {
  userId: string;
  profile: Profile;
  cachedAt: string;
};

export async function readCachedProfile(
  userId: string
): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    if (parsed.userId !== userId) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

export async function writeCachedProfile(
  userId: string,
  profile: Profile
): Promise<void> {
  try {
    const payload: CachedProfile = {
      userId,
      profile,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* non-fatal */
  }
}

export async function clearCachedProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
