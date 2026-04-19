import {
  StyleSheet,
  Text,
  Animated,
  View,
  Easing,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { primaryBlack, primaryGreen, secondaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useLocalSearchParams, usePathname } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import { StatusBar } from "expo-status-bar";

const LoadingScreen = () => {
  const [isSetUp, setIsSetUp] = useState(false);
  const { from } = useLocalSearchParams();
  const { profile, setLoadingSetup } = useAuth();
  const rotation = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();
  const logoSize = useBeautyCodeLogoSize();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const animateWheel = () => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000, 
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };
    animateWheel();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    const isSetupMode =
      from?.includes("/(setup)") ||
      pathname.includes("/(setup)") ||
      from?.includes("ClientSetup") ||
      from?.includes("ProfessionalSetup");

    setIsSetUp(isSetupMode);

    if (isSetupMode) {
      console.log("LoadingScreen: Setup mode detected, will clear loadingSetup flag soon");

      const timer = setTimeout(() => {
        console.log("LoadingScreen: Clearing loadingSetup flag now");
        setLoadingSetup(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [from, pathname, setLoadingSetup]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom + responsiveMargin(28),
          },
        ]}
      >
        {/* Single cluster, optically lifted slightly above geometric center (reads calmer on tall phones). */}
        <View style={styles.centerWrap}>
          <View style={styles.cluster}>
            <Logo width={logoSize.width} height={logoSize.height} />

            <View style={styles.copy}>
              <Text style={[Typography.ag20, styles.headline]}>
                {isSetUp ? "Setting up your profile..." : "Welcome"}
              </Text>

              {!isSetUp && profile?.full_name && (
                <Text
                  style={[Typography.bodyLarge, styles.name]}
                  numberOfLines={2}
                >
                  {profile.full_name}
                </Text>
              )}
            </View>

            <Animated.View
              style={[
                styles.loadingWheel,
                { transform: [{ rotate: spin }] },
              ]}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
    paddingHorizontal: responsivePadding(24),
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  cluster: {
    alignItems: "center",
    width: "100%",
    maxWidth: responsiveScale(400, 440),
    /** Pulls the block slightly upward so it feels centered in the “content” area, not low on the screen. */
    marginTop: -responsiveMargin(56),
  },
  copy: {
    alignItems: "center",
    width: "100%",
    marginTop: responsiveMargin(36),
    marginBottom: responsiveMargin(40),
    paddingHorizontal: responsivePadding(4),
    maxWidth: 340,
  },
  headline: {
    textAlign: "center",
    color: primaryBlack,
  },
  name: {
    textAlign: "center",
    color: primaryBlack,
    marginTop: responsiveMargin(10),
    fontFamily: "Outfit_700Bold",
  },
  loadingWheel: {
    width: responsiveScale(44, 52),
    height: responsiveScale(44, 52),
    borderWidth: responsiveScale(3, 4),
    borderRadius: responsiveScale(999),
    borderColor: secondaryGreen,
    borderTopColor: primaryBlack,
  },
});
