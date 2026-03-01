import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import { 
  responsiveScale, 
  responsiveFontSize,
  responsiveBorderRadius
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const CheckMail = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor= {Colors.dark.yellowish} /> 
      <View style={styles.textBox}>
        <Text style={styles.text}>Please check your email</Text>
      </View>
    </SafeAreaView>
  );
};

export default CheckMail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: responsiveScale(20),
    backgroundColor: Colors.dark.yellowish,
  },
  textBox: {
    backgroundColor: Colors.dark.light,
    width: "98%",
    height: "15%",
    alignSelf: "center",
    borderRadius: responsiveBorderRadius(20),
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(20, 16),
    color: Colors.dark.dark,
  },
});