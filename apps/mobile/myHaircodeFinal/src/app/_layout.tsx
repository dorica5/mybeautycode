import React, { useCallback, useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import * as ScreenOrientation from "expo-screen-orientation";
import { AppState, Platform, View } from "react-native";
import { PortraitEnforcer } from "../components/PortraitEnforcer";
import { SetupProvider } from "../providers/SetUpProvider";
import AuthProvider from "../providers/AuthProvider";
import QueryProvider from "../providers/QueryProvider";
import { CameraProvider } from "../providers/CameraProvider";
import MarkProvider from "../providers/MarkProvider";
import { ImageProvider } from "../providers/ImageProvider";
import "react-native-url-polyfill/auto";
import { RealTimeProvider } from "../providers/RealTimeProvider";
import LoadingScreen from "./(setup)/LoadingScreen";
import useLoadFonts from "@/hooks/useLoadFonts";
import { PostHogProvider } from "posthog-react-native";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

export const scheme = "myhaircode";

const RootLayout = () => {
  const lockPortrait = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    const tryPlatform = async () => {
      if (Platform.OS === "ios") {
        await ScreenOrientation.lockPlatformAsync({
          screenOrientationArrayIOS: [ScreenOrientation.Orientation.PORTRAIT_UP],
        });
        return;
      }
      if (Platform.OS === "android") {
        await ScreenOrientation.lockPlatformAsync({
          screenOrientationConstantAndroid: 1,
        });
      }
    };
    try {
      // Any portrait (blocks landscape); works on more devices than PORTRAIT_UP alone.
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      );
    } catch {
      try {
        await tryPlatform();
      } catch {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch {
          /* native module missing (e.g. old Expo Go) */
        }
      }
    }
  }, []);

  useEffect(() => {
    void lockPortrait();
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void lockPortrait();
      }
    });
    const orientSub =
      Platform.OS === "web"
        ? { remove: () => undefined }
        : ScreenOrientation.addOrientationChangeListener(() => {
            void lockPortrait();
          });
    return () => {
      appSub.remove();
      orientSub.remove();
    };
  }, [lockPortrait]);

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log("Deep link received:", url);

      const parsedUrl = Linking.parse(url);
      console.log("Parsed URL:", parsedUrl);

      let access_token = parsedUrl.queryParams?.access_token as
        | string
        | undefined;
      let refresh_token = parsedUrl.queryParams?.refresh_token as
        | string
        | undefined;

      if (!access_token || !refresh_token) {
        const hash = url.split("#")[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          access_token = params.get("access_token") || undefined;
          refresh_token = params.get("refresh_token") || undefined;
        }
      }

      if (
        parsedUrl.hostname === "reset-password" &&
        access_token &&
        refresh_token
      ) {
        router.push({
          pathname: "/reset-password",
          params: { access_token, refresh_token },
        });
      }
    };

    // Handle initial URL (when app is opened from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL:", url);
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("URL event:", event.url);
      handleDeepLink(event.url);
    });

    return () => subscription?.remove();
  }, []);
  const fontsLoaded = useLoadFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingScreen />
        <PortraitEnforcer />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <PostHogProvider
      apiKey="phc_JdmTA0CNQRVrMvtk9zd2C9AXhrEt5mPEX09QRfd2WTR"
      options={{
        host: "https://eu.i.posthog.com",
      }}
    >
      <AuthProvider>
        <RealTimeProvider>
          <QueryProvider>
            <ImageProvider>
              <MarkProvider>
                <CameraProvider>
                  <SetupProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        gestureEnabled: false,
                      }}
                    >
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(hairdresser)"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="(client)"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="search/[query]"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="inspiration"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="Screens"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="haircodes"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(setup)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="reset-password"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="support"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="restricted"
                        options={{ headerShown: false }}
                      />
                    </Stack>
                  </SetupProvider>
                </CameraProvider>
              </MarkProvider>
            </ImageProvider>
          </QueryProvider>
        </RealTimeProvider>
      </AuthProvider>
    </PostHogProvider>
    <PortraitEnforcer />
    </View>
  );
};

export default RootLayout;
