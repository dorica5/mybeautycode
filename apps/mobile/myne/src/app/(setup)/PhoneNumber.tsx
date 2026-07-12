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
import { setupSageBackground } from "@/src/constants/Colors";
import MyButton from "@/src/components/MyButton";
import { router } from "expo-router";
import { useSetup } from "@/src/providers/SetUpProvider";
import { useI18n } from "@/src/providers/LanguageProvider";

const PhoneNumber = () => {
  const { t } = useI18n();
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
        <SetUpNav title={t("setup.phoneNumberLabel")} />
        <SetUpTextInput
          title={"phoneNumber"}
          value={phoneNumber}
          placeholder={t("setup.enterPhoneNumber")}
          handleChangeText={(e) => setPhoneNumber(e)}
        />
        <View style={styles.btnContainer}>
          <MyButton
            text={t("common.next")}
            onPress={() => router.push("./FullName")}
            disabled={!isValid}
          />
        </View>
        {!isValid && phoneNumber.length > 0 && (
          <Text style={styles.errorText}>
            {t("setup.validPhoneRequired")}
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
    backgroundColor: setupSageBackground,
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
