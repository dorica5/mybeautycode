/* eslint-disable react/react-in-jsx-scope */
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Logo from "../../../assets/myHaircode_full_logo.svg";
import MyButton from "@/src/components/MyButton";
import { Href, router } from "expo-router";
import { Colors } from "@/src/constants/Colors";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { 
  responsiveScale, 
  scalePercent,
  isTablet
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const Splash = () => {
  const signUp = () => router.push("./SignUp" as Href);
  const goToSignIn = () => router.push("./SignIn");

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <LinearGradient
        colors={[
          Colors.dark.warmGreen,
          Colors.dark.warmGreen, //greenish
          Colors.dark.yellowish, //purpleish
          //brownish
        ]}
        style={styles.container}
        end={{ x: 0, y: 1 }}
      >
        {/*
<View style={styles.languageSwitcher}>
  <Pressable onPress={() => {
    // set language to English
  }}>
    <ResponsiveText size={24}>🇬🇧</ResponsiveText>
  </Pressable>
  
  <Pressable onPress={() => {
    // set language to Norwegian
  }}>
    <ResponsiveText size={24}>🇳🇴</ResponsiveText>
  </Pressable>
</View>




    <View style={styles.languageSwitcher}>
    */}

        <View style={styles.logoContainer}>
          <Logo width={responsiveScale(180, 240)} height={responsiveScale(240, 320)} />
        </View>

        <View style={styles.btnContainer}>
          <MyButton text="Sign in" onPress={goToSignIn} style={styles.btn} textSize={18} textTabletSize={14}/>
        </View>

        <View style={styles.textContainer}>
          <ResponsiveText size={18} tabletSize={12} style={styles.textStyle}>
            Don't have an account yet?
          </ResponsiveText>

          <Pressable onPress={signUp}>
            <ResponsiveText size={20} tabletSize={14} weight="Bold" style={styles.signInText}>
              Sign up
            </ResponsiveText>
          </Pressable>
        </View>
      </LinearGradient>
    </>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.warmGreen,
  },
  languageSwitcher: {
    position: "absolute",
    top: responsiveScale(40),
    right: responsiveScale(20),
    flexDirection: "row",
    gap: responsiveScale(5),
  },

  logoContainer: {
    alignItems: "center",
    marginTop: isTablet() ? scalePercent(16) : scalePercent(30),
  },
  btnContainer: {
    marginTop: scalePercent(30),
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scalePercent(10),
  },
  textStyle: {
    lineHeight: responsiveScale(24),
  },
  signInText: {
    lineHeight: responsiveScale(24),
  },
  btn: {
    width: scalePercent(90),
    alignSelf: "center",
    backgroundColor: Colors.dark.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: responsiveScale(2),
    //iOS Shadow
    shadowColor: "rgba(0, 0, 0)",
    shadowOffset: { width: 0, height: responsiveScale(5) },
    shadowOpacity: 0.3,
    shadowRadius: responsiveScale(5),

    //Android Shadow
    elevation: 10,
    transform: [{ translateY: -0.5 }],
  },
});