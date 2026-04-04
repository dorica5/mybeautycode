import {
  StyleSheet,
  Text,
  Animated,
  View,
  Easing,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../../../assets/myHaircode_half_logo.svg";
import { Colors } from "@/src/constants/Colors";
import { useLocalSearchParams, usePathname } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { moderateScale, responsivePadding, scale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const LoadingScreen = () => {
  const [isSetUp, setIsSetUp] = useState(false);
  const { from } = useLocalSearchParams();
  const { profile, setLoadingSetup } = useAuth();
  const rotation = useRef(new Animated.Value(0)).current;
  const pathname = usePathname();

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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={styles.logoContainer}>
        <Logo width={scale(180)} height={scale(180)} />
      </View>

      <Text style={styles.text}>
        {isSetUp ? "Setting up your profile..." : "Welcome"}
      </Text>

      {!isSetUp && profile?.full_name && (
        <Text style={styles.fullName}>{profile.full_name}</Text>
      )}

      <Animated.View
        style={[
          styles.loadingWheel,
          { transform: [{ rotate: spin }] },
        ]}
      />
    </SafeAreaView>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.warmGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
    fontSize: moderateScale(22),
    fontFamily: "Inter-Bold",
    color: Colors.dark.dark,
    marginTop: scalePercent(7),
    paddingHorizontal: responsivePadding(8, 10)
  },
  fullName: {
    textAlign: "center",
    fontSize: moderateScale(20),
    fontFamily: "Inter-Bold",
    color: Colors.dark.dark,
    marginTop: scalePercent(2), 
  },
  logoContainer: {
    alignItems: "center",
    marginTop: "-10%",
  },
  loadingWheel: {
    width: scale(50),
    height: scale(50),
    borderWidth: scale(5),
    borderRadius: scale(25),
    borderColor: Colors.dark.dark,
    borderTopColor: Colors.light.yellowish,
    alignSelf: "center",
    marginTop: scalePercent(20),
  },
});
