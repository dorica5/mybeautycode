import { Redirect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import LoadingScreen from "./(setup)/LoadingScreen";

/**
 * Bootstrap: first launch → Onboarding; otherwise Splash when logged out.
 * Signed-in users stay on `/` with a loader until global auth routing replaces away (home / setup).
 */
export default function Index() {
  const { session, isFirstLaunch, firstLaunchLoading, loading } = useAuth();

  if (loading || firstLaunchLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    if (isFirstLaunch) {
      return <Redirect href="/(auth)/Onboarding" />;
    }
    return <Redirect href="/Splash" />;
  }

  return <LoadingScreen />;
}
