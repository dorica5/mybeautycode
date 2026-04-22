import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  primaryBlack,
  primaryGreen,
  secondaryGreen,
} from "@/src/constants/Colors";
import { responsiveScale } from "@/src/utils/responsive";

/** Same ring as `LoadingScreen` — use inside a layout or standalone full screen. */
export function MintSpinningWheel() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[styles.loadingWheel, { transform: [{ rotate: spin }] }]}
    />
  );
}

/** Mint safe-area + centered spinner (e.g. while relationship / route data resolves). */
export function MintFullScreenSpinner() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <MintSpinningWheel />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: primaryGreen,
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
