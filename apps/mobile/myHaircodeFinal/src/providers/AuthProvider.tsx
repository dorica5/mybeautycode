/* eslint-disable react/react-in-jsx-scope */
import { supabase } from "../lib/supabase";
import { api, setApiOn401 } from "../lib/apiClient";
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
import {
  getLastAppSurface,
  setLastAppSurface,
  type LastAppSurface,
} from "../lib/lastVisitPreference";
import { profileHasProfessionalCapability } from "../constants/professionCodes";
import { router, usePathname, useSegments } from "expo-router";
import { Alert } from "react-native";
import { Profile } from "../constants/types";
import { useImageContext } from "./ImageProvider";
import LoadingScreen from "../app/(setup)/LoadingScreen";
import { registerForPushNotificationAsync } from "./useNotifcations";
import { useSyncSignupDate } from "./SignUpDate";
import { useFirstLaunch } from "../hooks/useFirstLaunch";
import { usePostHog } from "posthog-react-native";
/** Dev-only: force onboarding when unauthenticated. Keep `false` so real signup/sign-in flows work. */
const DEV_FORCE_SHOW_ONBOARDING = false;

/**
 * Legacy heuristics: profile looks "finished" but `setup_status` may still be false in DB.
 * Used only to run {@link ensureSetupStatusPersisted} so cross-device login reads `true` from `/api/auth/me`.
 */
function legacyProfileLooksCompleteForSetupSync(
  profile: Profile | null | undefined
): boolean {
  if (!profile) return false;
  const fn = profile.first_name?.trim();
  const ln = profile.last_name?.trim();
  const display = profile.full_name?.trim();
  const hasName = Boolean((fn && ln) || (display && display.length > 0));
  const hasContact =
    Boolean(profile.phone_number?.trim()) &&
    Boolean(profile.country?.trim());
  const hasUsername = Boolean(profile.username?.trim());
  if (hasName && hasContact && hasUsername) return true;
  if (hasContact && Boolean(display && display.length > 0)) return true;
  return false;
}

async function ensureSetupStatusPersisted(
  userId: string,
  profile: Profile
): Promise<Profile> {
  if (profile.setup_status === true) return profile;
  if (!legacyProfileLooksCompleteForSetupSync(profile)) return profile;
  try {
    await api.put(`/api/profiles/${userId}`, {
      id: userId,
      setup_status: true,
    });
    return (await api.get("/api/auth/me")) as Profile;
  } catch (e) {
    console.warn("ensureSetupStatusPersisted failed", e);
    return profile;
  }
}

/**
 * Whether onboarding (Setup / GeneralSetup) can be skipped.
 * Source of truth is DB `setup_status` from the API (snake_case `setup_status`).
 */
export function profileSetupIsComplete(
  profile: Profile | null | undefined
): boolean {
  if (!profile) return false;
  return (
    profile.setup_status === true ||
    (profile as { setupStatus?: boolean }).setupStatus === true
  );
}

/**
 * Completed setup: redirect off first-run onboarding/auth shells (so users aren’t stuck on Welcome / Sign-in).
 * Do not include add-profession or professional setup — those users are already complete and must stay
 * on ChooseProfession / AddProfession / ProfessionalSetup until they finish or go back.
 */
function shouldCompletedUserLeaveForHome(pathname: string): boolean {
  const p = pathname ?? "";
  if (
    p.includes("ChangePassword") ||
    p.includes("reset-password") ||
    p.includes("CheckMail") ||
    p.includes("Delete")
  ) {
    return false;
  }
  const bootstrap = [
    "/Setup",
    "GeneralSetup",
    "ChooseRole",
    "ClientSetup",
    "TermsAndPrivacy",
    "/Splash",
    "/SignUp",
    "/SignIn",
    "Onboarding",
  ];
  if (bootstrap.some((x) => p.includes(x))) return true;
  if (p === "/" || p === "") return true;
  if (p.includes("(setup)") && p.includes("LoadingScreen")) return true;
  return false;
}

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
  /** Mirrors AsyncStorage last visit; `undefined` while loading for dual-role users. */
  lastAppSurfacePref: LastAppSurface | null | undefined;
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
  lastAppSurfacePref: undefined,
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
  const prevLoadingSetupRef = useRef<boolean | null>(null);
  const isSigningOut = useRef(false);
  const isChangingPassword = useRef(false);
  const pathname = usePathname();
  const segments = useSegments();
  const postHog = usePostHog();

  /** `undefined` until AsyncStorage read finishes for this user (professional dual-stack routing). */
  const [lastAppSurfacePref, setLastAppSurfacePref] = useState<
    LastAppSurface | null | undefined
  >(undefined);

  const [isNavigating, setIsNavigating] = useState(false);
  const onOnboarding = pathname.includes("Onboarding");

  useEffect(() => {
    if (pathname.includes("ChangePassword") || pathname.includes("reset-password")) {
      isChangingPassword.current = true;
    } else {
      isChangingPassword.current = false;
    }
  }, [pathname]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setLastAppSurfacePref(undefined);
      return;
    }
    let cancelled = false;
    getLastAppSurface(uid).then((v) => {
      if (cancelled) return;
      /** Tab routes set surface synchronously; don’t let a stale AsyncStorage read overwrite it. */
      setLastAppSurfacePref((prev) =>
        prev === "client" || prev === "professional" ? prev : v
      );
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  /**
   * Track client vs professional shell using route segments — not `pathname`.
   * Hairdresser tabs navigate with short hrefs (`/home`, `/inspiration`) that omit
   * `(hairdresser)/(tabs)`, so pathname checks never marked the pro surface.
   * Global screens (e.g. `/inspiration`) do not match here and leave the last surface unchanged.
   */
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const root = segments[0];
    const second = segments[1];
    if (root === "(client)" && second === "(tabs)") {
      setLastAppSurfacePref("client");
      void setLastAppSurface(uid, "client");
      return;
    }
    if (root === "(hairdresser)" && second === "(tabs)") {
      setLastAppSurfacePref("professional");
      void setLastAppSurface(uid, "professional");
    }
  }, [segments, session?.user?.id]);

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

      let profileData: Profile | null = null;
      let profileError: unknown = null;
      /** Retries: 404 (profile row lag), 5xx (cold start / transient DB). */
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          profileData = (await api.get("/api/auth/me")) as Profile;
          profileError = null;
          break;
        } catch (e: unknown) {
          profileError = e;
          const err = e as Error & { status?: number };
          const status = err.status;
          const msg = (err.message ?? "").toLowerCase();
          const noProfileYet =
            status === 404 ||
            msg.includes("profile not found") ||
            (msg.includes("not found") && status !== 500);
          const transient =
            status === 500 ||
            status === 502 ||
            status === 503 ||
            msg.includes("failed to fetch profile");
          if ((noProfileYet || transient) && attempt < 5) {
            const delay = transient ? 650 * (attempt + 1) : 350 * (attempt + 1);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          break;
        }
      }

      if (!profileData && profileError) {
        const err = profileError as Error & { status?: number };
        const status = err.status;
        const msg = (err.message ?? "").toLowerCase();
        const noProfileYet =
          status === 404 ||
          msg.includes("profile not found") ||
          msg.includes("not found");

        /**
         * Backend sometimes returns 500 (e.g. serialize bug) even when `profiles` exists
         * in Supabase. Do not wipe the Supabase session — continue to setup/home and retry later.
         * Still sign out on 401 (handled above via on401 before throw).
         */
        const apiBugOrTransient =
          status === 500 ||
          status === 502 ||
          status === 503 ||
          msg.includes("failed to fetch profile");

        if (noProfileYet || apiBugOrTransient) {
          console.log(
            "Profile API unavailable or missing — keeping session",
            { status, msg: err.message },
          );
          profileData = null;
        } else {
          console.error("Error fetching profile:", profileError);
          await clearProfile();
          setLoading(false);
          setLoadingProfile(false);
          return;
        }
      }
      if (!profileData) {
        setProfile(null);
        setUserStatus(null);
        setIsSignUp(true);
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
        profileData = await ensureSetupStatusPersisted(
          data.session.user.id as string,
          profileData as Profile
        );
        setProfile(profileData as Profile);
        const setupComplete = profileSetupIsComplete(profileData as Profile);
        setIsSignUp(!setupComplete);
        await syncSignupDate(data.session, profileData);
        postHog.capture("App Opened", {
          role:
            (profileData as { user_type?: string }).user_type ?? "unknown",
        });
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

    if (
      !session &&
      (isFirstLaunch || DEV_FORCE_SHOW_ONBOARDING) &&
      !firstLaunchHandled.current
    ) {
      if (onOnboarding) {
        return;
      }
      console.log(
        DEV_FORCE_SHOW_ONBOARDING
          ? "DEV_FORCE_SHOW_ONBOARDING: showing onboarding"
          : "First launch: showing onboarding"
      );
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
        const setupScreens = [
          "/Setup",
          "/GeneralSetup",
          "/ChooseRole",
          "/ChooseProfession",
          "/AddProfession",
          "/ClientSetup",
          "/ProfessionalSetup",
          "/LoadingScreen",
          "/TermsAndPrivacy",
          "/(setup)/Setup",
          "/(setup)/GeneralSetup",
          "/(setup)/ChooseRole",
          "/(setup)/ChooseProfession",
          "/(setup)/AddProfession",
          "/(setup)/ClientSetup",
          "/(setup)/ProfessionalSetup",
          "/(setup)/LoadingScreen",
          "/(setup)/TermsAndPrivacy",
        ];
        const isOnSetupScreen = setupScreens.some((screen) =>
          pathname.includes(screen),
        );
        if (!isOnSetupScreen) {
          console.log("Session without profile — sending user to setup");
          setIsNavigating(true);
          setTimeout(() => {
            router.replace("/Setup");
            setTimeout(() => setIsNavigating(false), 1000);
          }, 100);
        }
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

      const setupComplete = profileSetupIsComplete(profile);
      if (profile && !setupComplete) {
        console.log("Profile exists but setup incomplete");
        const setupScreens = [
          "/Setup",
          "/GeneralSetup",
          "/ChooseRole",
          "/ChooseProfession",
          "/AddProfession",
          "/ClientSetup",
          "/ProfessionalSetup",
          "/LoadingScreen",
          "/TermsAndPrivacy",
          "/(setup)/Setup",
          "/(setup)/GeneralSetup",
          "/(setup)/ChooseRole",
          "/(setup)/ChooseProfession",
          "/(setup)/AddProfession",
          "/(setup)/ClientSetup",
          "/(setup)/ProfessionalSetup",
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
        const isHairdresser = profileHasProfessionalCapability(profile);

        const clientHome = "/(client)/(tabs)/home";
        const proHome = "/(hairdresser)/(tabs)/home";

        let home: string;
        if (!isHairdresser) {
          home = clientHome;
        } else if (lastAppSurfacePref === undefined) {
          console.log(
            "Blocking navigation: waiting for last-visited app surface preference"
          );
          return;
        } else if (lastAppSurfacePref === "client") {
          home = clientHome;
        } else {
          home = proHome;
        }

        const leaveBootstrap = shouldCompletedUserLeaveForHome(pathname);
        const shouldGoHome =
          leaveBootstrap || !initialLoadComplete.current;

        if (shouldGoHome) {
          console.log("Redirecting to home", {
            home,
            leaveBootstrap,
            pathname,
            isHairdresser,
            lastAppSurfacePref,
          });
          setIsNavigating(true);
          setTimeout(() => {
            router.replace(home);
            initialLoadComplete.current = true;
            setTimeout(() => setIsNavigating(false), 1000);
          }, 100);
        }
      }

      return;
    }

    if (!session && !isFirstLaunch && !DEV_FORCE_SHOW_ONBOARDING) {
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
    lastAppSurfacePref,
  ]);

  useEffect(() => {
    if (session?.user?.id && profileSetupIsComplete(profile)) {
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
    setApiOn401(() => signOut());
  }, []);

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

  /** Only refetch when legacy setup flows flip loadingSetup true → false (avoids duplicate /me on every cold start). */
  useEffect(() => {
    const prev = prevLoadingSetupRef.current;
    prevLoadingSetupRef.current = loadingSetup;
    if (prev !== true || loadingSetup !== false || !session?.user?.id) return;

    const refreshProfile = async () => {
      try {
        let data = (await api.get("/api/auth/me")) as Profile;
        data = await ensureSetupStatusPersisted(session.user.id, data);
        setProfile(data);
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
    };
    void refreshProfile();
  }, [loadingSetup, session?.user?.id]);

  useSyncSignupDate();

  const isAuthed = !!session;
  const setupCompleteForNav = profileSetupIsComplete(profile);
  const isHairdresserCapable =
    !!profile &&
    setupCompleteForNav &&
    profileHasProfessionalCapability(profile);

  const shouldHoldTree =
    loading ||
    firstLaunchLoading ||
    (isAuthed && loadingProfile) ||
    (isAuthed && isHairdresserCapable && lastAppSurfacePref === undefined);

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
        lastAppSurfacePref,
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