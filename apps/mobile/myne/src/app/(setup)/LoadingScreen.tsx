import { StyleSheet, Text, View, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { MintSpinningWheel } from "@/src/components/MintSpinningWheel";
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
import { useI18n } from "@/src/providers/LanguageProvider";

const LoadingScreen = ({
  connectionError = false,
  onRetry,
}: {
  connectionError?: boolean;
  onRetry?: () => void;
}) => {
  const { t } = useI18n();
  const [isSetUp, setIsSetUp] = useState(false);
  const { from } = useLocalSearchParams();
  const { profile, setLoadingSetup } = useAuth();
  const pathname = usePathname();
  const logoSize = useBeautyCodeLogoSize();
  const insets = useSafeAreaInsets();

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
                {connectionError
                  ? t("setup.cantReachServer")
                  : isSetUp
                    ? t("setup.settingUp")
                    : t("setup.welcome")}
              </Text>

              {connectionError ? (
                <Text style={[Typography.bodyLarge, styles.name]}>
                  {t("setup.connectionErrorHint")}
                </Text>
              ) : (
                !isSetUp &&
                profile?.full_name && (
                  <Text
                    style={[Typography.bodyLarge, styles.name]}
                    numberOfLines={2}
                  >
                    {profile.full_name}
                  </Text>
                )
              )}
            </View>

            {connectionError && onRetry ? (
              <Pressable onPress={onRetry} style={styles.retryButton}>
                <Text style={styles.retryLabel}>{t("common.tryAgain")}</Text>
              </Pressable>
            ) : (
              <MintSpinningWheel />
            )}
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
  retryButton: {
    marginTop: responsiveMargin(8),
    borderRadius: 999,
    backgroundColor: primaryBlack,
    paddingHorizontal: responsivePadding(28),
    paddingVertical: responsivePadding(14),
  },
  retryLabel: {
    color: primaryGreen,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
  },
});
