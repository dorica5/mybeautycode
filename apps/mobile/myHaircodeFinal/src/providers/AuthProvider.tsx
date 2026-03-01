/* eslint-disable react/react-in-jsx-scope */
import { supabase } from "../lib/supabase";
import { api } from "../lib/apiClient";
import { Session } from "@supabase/supabase-js";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { Alert } from "react-native";
import { Profile } from "../constants/types";
import { useImageContext } from "./ImageProvider";
import LoadingScreen from "../app/(setup)/LoadingScreen";
import { registerForPushNotificationAsync } from "./useNotifcations";
import { useSyncSignupDate } from "./SignUpDate";
import { useFirstLaunch } from "../hooks/useFirstLaunch";
import { usePostHog } from "posthog-react-native";

type UserStatus = {
  can_act: boolean;
  is_banned: boolean;
  is_restricted: boolean;
  ban_reason?: string;
  restriction_end?: string;
  status: 'active' | 'banned' | 'restricted';
};

type AuthData = {
  session: Session | null;
  profile: any;
  loading: boolean;
  isSignUp: boolean;
  loadingSetup: boolean;
  isSigningOut: boolean;
  userStatus: UserStatus | null;
  setProfile: (profile: any) => void;
  signOut: () => void;
  clearProfile: () => void;
  setLoadingSetup: (loadingSetup: boolean) => void;
};

export const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  loading: true,
  loadingSetup: false,
  isSignUp: false,
  isSigningOut: false,
  userStatus: null,
  setProfile: () => {},
  signOut: () => {},
  clearProfile: () => {},
  setLoadingSetup: () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const { loading: firstLaunchLoading, isFirstLaunch } = useFirstLaunch();
  const [expoPushToken, setExpoPushToken] = useState(null);
  const { imagesLoading } = useImageContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const initialLoadComplete = useRef(false);
  const isSigningOut = useRef(false);
  const isChangingPassword = useRef(false);
  const pathname = usePathname();
  const postHog = usePostHog()

  const [isNavigating, setIsNavigating] = useState(false);
  const onOnboarding = pathname.includes("Onboarding");

  useEffect(() => {
    if (pathname.includes("ChangePassword") || pathname.includes("reset-password")) {
      isChangingPassword.current = true;
    } else {
      isChangingPassword.current = false;
    }
  }, [pathname]);

  const clearProfile = async () => {
    console.log("Clearing session and profile...");
    setSession(null);
    setProfile(null);
    setUserStatus(null);
    initialLoadComplete.current = false;
    await AsyncStorage.removeItem("session");
    await AsyncStorage.removeItem("profile");
  };

  const checkUserStatus = async (userId: string): Promise<UserStatus | null> => {
    try {
      const statusResult = await api.get<UserStatus>("/api/auth/status");
      return statusResult;
    } catch (error) {
      console.error("Error in checkUserStatus:", error);
      return null;
    }
  };

  const handleRestrictedUser = (userStatus: UserStatus) => {
    if (userStatus.is_banned) {
      Alert.alert(
        "Account Suspended",
        `Your account has been permanently suspended. ${userStatus.ban_reason ? `Reason: ${userStatus.ban_reason}` : ''} Contact support if you believe this is an error.`,
        [
          {
            text: "Contact Support",
            onPress: () => {
              router.replace("/support");
            }
          },
          {
            text: "Sign Out",
            onPress: () => signOut(),
            style: "destructive"
          }
        ]
      );
      return true;
    }

    if (userStatus.is_restricted) {
      const restrictionEnd = userStatus.restriction_end
        ? new Date(userStatus.restriction_end).toLocaleDateString()
        : 'unknown';
      Alert.alert(
        "Account Temporarily Restricted",
        `Your account is temporarily restricted until ${restrictionEnd}. Contact support if you believe this is an error.`,
        [
          {
            text: "Contact Support",
            onPress: () => {
              router.replace("/support");
            }
          },
          {
            text: "OK",
            style: "default"
          }
        ]
      );
      return true;
    }

    return false;
  };

  const syncSignupDate = async (session: Session, profile: Profile) => {
    if (!profile.signup_date && session.user.created_at) {
      try {
        await api.put(`/api/profiles/${session.user.id}`, {
          signup_date: session.user.created_at,
          updated_at: new Date().toISOString(),
        });
        setProfile((prev) =>
          prev
            ? { ...prev, signup_date: session.user.created_at }
            : null
        );
      } catch (error) {
        console.error("Error syncing signup date:", error);
      }
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      isSigningOut.current = true;
      setLoading(true);
      initialLoadComplete.current = false;
      await clearProfile();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      isSigningOut.current = false;
    } finally {
      setLoading(false);
      isSigningOut.current = false;
    }
  };

  const fetchSessionAndProfile = async () => {
    setLoading(true);
    setLoadingProfile(true);
    console.log("Fetching session...");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error fetching session:", error.message);
      setLoading(false);
      setLoadingProfile(false);
      return;
    }

    if (data.session) {
      setSession(data.session);
      console.log("Fetching profile for user:", data.session.user.id);

      let profileData;
      try {
        profileData = await api.get("/api/auth/me");
      } catch (profileError) {
        console.error("Error fetching profile:", profileError);
        await clearProfile();
        setLoading(false);
        setLoadingProfile(false);
        return;
      }
      if (!profileData) {
        await clearProfile();
        setLoading(false);
        setLoadingProfile(false);
        return;
      }

      if (profileData) {
        const status = await checkUserStatus(data.session.user.id as string);
        setUserStatus(status);

        if (status && !status.can_act) {
          const wasHandled = handleRestrictedUser(status);
          if (wasHandled && status.is_banned) {
            setLoading(false);
            setLoadingProfile(false);
            return;
          }
        }
      }

      if (data.session && profileData) {
        setProfile(profileData as Profile);
        const setupComplete = (profileData as { setup_status?: boolean; setupStatus?: boolean })?.setup_status ?? (profileData as { setup_status?: boolean; setupStatus?: boolean })?.setupStatus;
        setIsSignUp(!setupComplete);
        await syncSignupDate(data.session, profileData);
        postHog.capture("App Opened", { role: profile?.user_type ?? "unknown" })
      }
    } else {
      console.log("No session found. Clearing profile...");
      await clearProfile();
    }

    setLoading(false);
    setLoadingProfile(false);
  };

  const navigateToSplash = () => {
    console.log("Navigating to splash screen");
    setTimeout(() => {
      router.replace("/Splash");
    }, 100);
  };

  console.log("Navigation check starting", {
    loading,
    loadingProfile,
    loadingSetup,
    session,
    profile,
    userStatus,
    pathname,
  });

  const firstLaunchHandled = useRef(false);

  const handleNavigation = () => {
    console.log("Navigation check", {
      loading,
      loadingProfile,
      loadingSetup,
      firstLaunchLoading,
      isFirstLaunch,
      session: !!session,
      profile: !!profile,
      userStatus,
      pathname,
      profileSetupStatus: profile?.setup_status,
      initialLoadComplete: initialLoadComplete.current,
      isNavigating,
      isSigningOut: isSigningOut.current,
      isChangingPassword: isChangingPassword.current,
    });

    if (isNavigating) {
      console.log("Already navigating, skipping…");
      return;
    }

    if (loading || loadingProfile || loadingSetup || firstLaunchLoading) {
      console.log("Blocking navigation: still loading essential data");
      return;
    }

    if (userStatus?.is_banned) {
      console.log("Blocking navigation: user is banned");
      return;
    }

    if (!session && isFirstLaunch && !firstLaunchHandled.current) {
      if (onOnboarding) {
        return;
      }
      console.log("First launch: showing onboarding");
      firstLaunchHandled.current = true;
      setIsNavigating(true);
      setTimeout(() => {
        router.replace("./(auth)/Onboarding");
        setTimeout(() => setIsNavigating(false), 600);
      }, 50);
      return;
    }

    if (session) {
      if (isSigningOut.current) {
        console.log("Blocking navigation: signing out");
        return;
      }

      if (isChangingPassword.current && (pathname.includes("ChangePassword") || pathname.includes("reset-password"))) {
        console.log("Blocking navigation: changing password");
        return;
      }

      if (!profile) {
        console.log("Session exists but no profile loaded yet, waiting...");
        return;
      }

      if (userStatus?.is_restricted && !pathname.includes("/restricted") && !pathname.includes("/support")) {
        console.log("User is restricted, redirecting to restricted page");
        setIsNavigating(true);
        setTimeout(() => {
          router.replace("/restricted");
          setTimeout(() => setIsNavigating(false), 600);
        }, 50);
        return;
      }

      const setupComplete = profile?.setup_status ?? (profile as { setupStatus?: boolean })?.setupStatus;
      if (profile && !setupComplete) {
        console.log("Profile exists but setup incomplete");
        const setupScreens = [
          "/Setup",
          "/ChooseRole",
          "/ClientSetup",
          "/HairdresserSetup",
          "/LoadingScreen",
          "/TermsAndPrivacy",
          "/(setup)/Setup",
          "/(setup)/ChooseRole",
          "/(setup)/ClientSetup",
          "/(setup)/HairdresserSetup",
          "/(setup)/LoadingScreen",
          "/(setup)/TermsAndPrivacy",
        ];
        const isOnSetupScreen = setupScreens.some((screen) =>
          pathname.includes(screen)
        );

        if (!isOnSetupScreen) {
          console.log("Redirecting to setup from:", pathname);
          setIsNavigating(true);
          setTimeout(() => {
            router.replace("/Setup");
            setTimeout(() => setIsNavigating(false), 1000);
          }, 100);
        }
        return;
      }

      if (profile && setupComplete) {
        // Navigate users directly to their home screens based on user type
        const userType = profile.user_type ?? (profile as { userType?: string })?.userType;
        if (userType === "CLIENT") {
          if (!initialLoadComplete.current) {
            console.log("Redirecting to client home");
            setIsNavigating(true);
            setTimeout(() => {
              router.replace("/(client)/(tabs)/home");
              initialLoadComplete.current = true;
              setTimeout(() => setIsNavigating(false), 1000);
            }, 100);
          }
        } else if (userType === "HAIRDRESSER") {
          if (!initialLoadComplete.current) {
            console.log("Redirecting to hairdresser home");
            setIsNavigating(true);
            setTimeout(() => {
              router.replace("/(hairdresser)/(tabs)/home");
              initialLoadComplete.current = true;
              setTimeout(() => setIsNavigating(false), 1000);
            }, 100);
          }
        } else {
          console.error("Unknown user type:", userType);
          initialLoadComplete.current = true;
        }
      }

      return;
    }

    if (!session && !isFirstLaunch) {
      const authPaths = [
        "Splash",
        "SignIn",
        "SignUp",
        "ChangePassword",
        "Reset",
        "CheckMail",
        "(auth)",
        "/auth/",
        "reset-password"
      ];
      const isOnAuthScreen = authPaths.some((path) => pathname.includes(path));

      if (!isOnAuthScreen) {
        console.log("No session but onboarding complete, navigating to splash");
        setIsNavigating(true);
        setTimeout(() => {
          router.replace("/Splash");
          setTimeout(() => setIsNavigating(false), 600);
        }, 50);
      }

      return;
    }

    if (!session) {
      console.log("Blocking navigation: no session (fallback)");
      return;
    }
  };

  useEffect(() => {
    if (!isNavigating) {
      handleNavigation();
    }
  }, [
    loading,
    loadingProfile,
    session,
    profile,
    userStatus,
    pathname,
    loadingSetup,
    isNavigating,
    firstLaunchLoading,
    isFirstLaunch,
  ]);

  useEffect(() => {
    if (session?.user?.id && profile?.setup_status) {
      const interval = setInterval(async () => {
        console.log("Periodic user status check...");
        const status = await checkUserStatus(session.user.id);
        setUserStatus(status);

        if (status && !status.can_act) {
          handleRestrictedUser(status);
        }
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [session?.user?.id, profile?.setup_status]);

  useEffect(() => {
    if (session?.user?.id) {
      console.log("Registering push notifications for user:", session.user.id);
      try {
        registerForPushNotificationAsync(session.user.id)
          .then((token) => {
            if (token) {
              console.log("Successfully registered token:", token);
              setExpoPushToken(token as any);
            }
          })
          .catch((error) => {
            console.error("Failed to register for push notifications:", error);
          });
      } catch (error) {
        console.error("Error in push notification registration:", error);
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    console.log("Initializing AuthProvider...");
    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed. Event:", event);

        if (
          isChangingPassword.current &&
          (event === "PASSWORD_RECOVERY" ||
            event === "TOKEN_REFRESHED" ||
            event === "USER_UPDATED")
        ) {
          console.log("Password change flow detected, not navigating");
          setSession(newSession);
          return;
        }

        if (newSession) {
          setSession(newSession);
          initialLoadComplete.current = false;
          isSigningOut.current = false;
          fetchSessionAndProfile();
        } else {
          console.log("Session is null from auth event");
          await clearProfile();
          if (
            !isSigningOut.current &&
            !isFirstLaunch &&
            !onOnboarding &&
            !firstLaunchLoading
          ) {
            navigateToSplash();
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loadingSetup === false && session) {
      const refreshProfile = async () => {
        try {
          const data = await api.get("/api/auth/me");
          if (data) {
            setProfile(data as Profile);
            initialLoadComplete.current = false;
          }
        } catch (err) {
          console.error("Error refreshing profile:", err);
        }
      };
      refreshProfile();
    }
  }, [loadingSetup, session]);

  useSyncSignupDate();

  const isAuthed = !!session;
  const shouldHoldTree = loading || firstLaunchLoading || (isAuthed && loadingProfile);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        loadingSetup,
        isSignUp,
        isSigningOut: isSigningOut.current,
        userStatus,
        setProfile,
        signOut,
        clearProfile,
        setLoadingSetup,
      }}
    >
      {shouldHoldTree ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);