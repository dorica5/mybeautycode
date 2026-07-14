import { Redirect } from "expo-router";
import { useAuth, profileSetupIsComplete } from "@/src/providers/AuthProvider";
import { resolveAppHome } from "@/src/lib/resolveAppHome";
import LoadingScreen from "./(setup)/LoadingScreen";

/**
 * Bootstrap: first launch → Onboarding; logged out → Splash; signed in → home or setup.
 */
export default function Index() {
  const {
    session,
    isFirstLaunch,
    firstLaunchLoading,
    loading,
    loadingProfile,
    profile,
    lastAppSurfacePref,
  } = useAuth();

  const bootstrapping =
    loading ||
    firstLaunchLoading ||
    (session != null && loadingProfile && profile == null);

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  if (!session) {
    if (isFirstLaunch) {
      return <Redirect href="/(auth)/Onboarding" />;
    }
    return <Redirect href="/(auth)/Splash" />;
  }

  if (profile && !profileSetupIsComplete(profile)) {
    return <Redirect href="/(setup)/Setup" />;
  }

  if (profile && profileSetupIsComplete(profile)) {
    const home = resolveAppHome(profile, lastAppSurfacePref);
    return <Redirect href={home} />;
  }

  return <LoadingScreen />;
}
