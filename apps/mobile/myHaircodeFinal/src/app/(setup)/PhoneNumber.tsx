import {
  Keyboard,
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import SetUpNav from "@/src/components/SetUpNav";
import SetUpTextInput from "@/src/components/SetUpTextInput";
import { Colors } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import { router } from "expo-router";
import { useSetup } from "@/src/providers/SetUpProvider";

const PhoneNumber = () => {
  const { phoneNumber, setPhoneNumber } = useSetup();
  const [isValid, setIsValid] = useState(false);

  const isValidNorwegianPhoneNumber = (phoneNumber: string) => {
    const regex = /^(?:\+47)?\d{8}$/;
    return regex.test(phoneNumber);
  };

  useEffect(() => {
    setIsValid(isValidNorwegianPhoneNumber(phoneNumber));
  }, [phoneNumber]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <SetUpNav title="Phone Number" />
        <SetUpTextInput
          title={"phoneNumber"}
          value={phoneNumber}
          placeholder="Enter your phone number"
          handleChangeText={(e) => setPhoneNumber(e)}
        />
        <View style={styles.btnContainer}>
          <MyButton
            text="Next"
            onPress={() => router.push("./FullName")}
            disabled={!isValid}
          />
        </View>
        {!isValid && phoneNumber.length > 0 && (
          <Text style={styles.errorText}>
            Please enter a valid Norwegian phone number.
          </Text>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default PhoneNumber;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.light,
  },
  btnContainer: {
    width: "25%",
    alignSelf: "center",
    margin: "5%",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
});
