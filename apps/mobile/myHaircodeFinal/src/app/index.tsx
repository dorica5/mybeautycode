import { Redirect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import LoadingScreen from "./(setup)/LoadingScreen";

/**
 * Bootstrap: only unauthenticated flows start at Splash (`/(auth)`).
 * Signed-in users stay on `/` with a loader until global auth routing replaces away (home / setup).
 */
export default function Index() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/Splash" />;
  }

  return <LoadingScreen />;
}
