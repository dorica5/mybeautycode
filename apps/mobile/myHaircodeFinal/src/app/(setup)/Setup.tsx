import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../../../assets/myHaircode_full_logo.svg";
import { Colors } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import { CheckBox } from "react-native-elements";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  responsiveScale,
  scalePercent,
  responsivePadding,
  responsiveFontSize,
  isTablet,
} from "@/src/utils/responsive";
import { Spacer } from "@/src/components/Spacer";

const Setup = () => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <SafeAreaView style={styles.background}>
      <ScrollView
        contentContainerStyle={{ padding: responsivePadding(20) }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo spacing */}
        <Spacer vertical={isTablet() ? scalePercent(14) : scalePercent(10)} />

        <ResponsiveText
          size={20}
          tabletSize={16}
          weight="Bold"
          style={styles.text}
        >
          Welcome to
        </ResponsiveText>

        <Spacer vertical={25} />

        <View style={styles.logoContainer}>
          <Logo
            width={responsiveScale(180, 240)}
            height={responsiveScale(240, 320)}
          />
        </View>

        <View
          style={{
            padding: responsivePadding(isTablet() ? 40 : 68),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MyButton
            text="Set up my account"
            textSize={18}
            textTabletSize={14}
            onPress={() => router.push("./ChooseRole")}
            disabled={!isChecked}
          />
        </View>

        <Spacer vertical={30} />

        <View style={styles.checkboxContainer}>
  <CheckBox
    checked={isChecked}
    onPress={() => setIsChecked(!isChecked)}
    containerStyle={styles.checkbox}
    checkedIcon={
      <MaterialIcons
        name="check-box"
        size={responsiveScale(30, 36)}
        color={Colors.dark.dark}
      />
    }
    uncheckedIcon={
      <MaterialIcons
        name="check-box-outline-blank"
        size={responsiveScale(30, 36)}
        color={Colors.dark.dark}
      />
    }
  />
  <View style={styles.checkboxTextWrapper}>
    <ResponsiveText
      size={15}
      tabletSize={12}
      weight="Regular"
      style={styles.checkboxText}
    >
      I have read and agree to the{" "}
      <Pressable onPress={() => router.push("/(setup)/TermsAndPrivacy")}>
        <ResponsiveText
          size={16}
          tabletSize={14}
          weight="Bold"
          style={styles.linkText}
        >
          Terms and privacy
        </ResponsiveText>
      </Pressable>
    </ResponsiveText>
  </View>
</View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Setup;

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.light.yellowish,
    height: "100%",
    flex: 1,
  },
  text: {
    textAlign: "center",
    color: Colors.dark.dark,
  },
  logoContainer: {
    alignItems: "center",
  },
  checkbox: {
    backgroundColor: Colors.light.yellowish,
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  
  linkText: {
    color: Colors.dark.dark,
    textDecorationLine: "underline",
  },
  checkboxContainer: {
  flexDirection: "row",
  alignItems: "center",  // keeps baseline centered
  paddingHorizontal: responsivePadding(40),
},
checkboxTextWrapper: {
  flexShrink: 1,
  justifyContent: "center",  // centers text with checkbox
},
checkboxText: {
  color: Colors.dark.dark,
  lineHeight: undefined, // let text auto-align
},

});
