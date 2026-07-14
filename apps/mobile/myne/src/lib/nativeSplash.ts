import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";

let preventCalled = false;

function useNativeSplashControl(): boolean {
  /** Expo Go owns the loading screen — preventAutoHideAsync leaves the app stuck on the project icon. */
  return Constants.appOwnership !== "expo";
}

/** Keep the native launch screen up until JS has painted our own loading UI. */
export function keepNativeSplashVisible(): void {
  if (!useNativeSplashControl()) return;
  if (preventCalled) return;
  preventCalled = true;
  void SplashScreen.preventAutoHideAsync();
}

export async function hideNativeSplash(): Promise<void> {
  if (!useNativeSplashControl()) return;
  try {
    await SplashScreen.hideAsync();
  } catch {
    /* already hidden or unavailable (e.g. web) */
  }
}
