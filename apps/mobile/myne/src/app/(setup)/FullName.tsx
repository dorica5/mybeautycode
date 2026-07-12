import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
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

const FullName = () => {
  const { t } = useI18n();
  const { name, setName } = useSetup();
  const [isValid, setIsValid] = useState(false);

  const isValidName = (name: string) => {
    const regex = /^[a-zA-Z\s'-]+$/;
    return regex.test(name) && name.trim().length > 0;
  };

  useEffect(() => {
    setIsValid(isValidName(name));
  }, [name]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <SetUpNav title={t("setup.clientFullName")} />
        <SetUpTextInput
          title={"fullName"}
          value={name}
          placeholder={t("setup.enterFullName")}
          handleChangeText={(e) => setName(e)}
        />
        <View style={styles.btnContainer}>
          <MyButton
            text={t("common.next")}
            onPress={() => router.push("./ProfilePicture")}
            disabled={!isValid}
          />
          {!isValid && name.length > 0 && (
            <Text style={styles.errorText}>
              {t("setup.fullNameInvalid")}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default FullName;

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
