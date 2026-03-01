/* eslint-disable react/react-in-jsx-scope */
import MyButton from "@/src/components/MyButton";
import MyTextinput from "@/src/components/MyTextinput";
import { Colors } from "@/src/constants/Colors";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";
import { 
  responsiveScale, 
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const Reset = () => {
  const [email, setEmail] = useState("");
  const resetPassword = async () => {
    const {data, error} = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: "myhaircode://reset-password", 
      }
    )
    if (error) {
      console.log("Error resetting password: ", error.message);
      return;
    }
    else{
      router.replace("/CheckMail");
    }
  };

  
  return (
    <>
      <StatusBar backgroundColor={Colors.dark.yellowish} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <Pressable onPress={() => router.back()}>
            <CaretLeft size={responsiveScale(30)} color={Colors.dark.dark} />
          </Pressable>
          <View style={styles.input}></View>
          <MyTextinput
            placeholder="Email"
            value={email}
            handleChangeText={(e) => setEmail(e)}
            title="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={{ marginTop: responsiveScale(30) }}>
            <MyButton
              text="Send me a new password"
              margin={false}
              onPress={resetPassword}
              textSize={18}
              textTabletSize={14}
            />
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </>
  );
};

export default Reset;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.yellowish,
    padding: responsiveScale(20, 20),
  },
  input: {
    height: "10%",
    marginTop: responsiveScale(250, 400),
  },
});