import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { responsivePadding } from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";

/** Default route (web). Native map is in `map.native.tsx`. */
export default function MapLocationScreen() {
  const { t } = useI18n();

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={navBackChromeStyles.screenBar}>
          <NavBackRow onPress={() => router.back()} />
        </View>
        <View style={styles.body}>
          <Text style={styles.message}>{t("discover.mapWebFallback")}</Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
  },
  message: {
    ...Typography.bodyMedium,
    textAlign: "center",
    color: primaryBlack,
  },
});
