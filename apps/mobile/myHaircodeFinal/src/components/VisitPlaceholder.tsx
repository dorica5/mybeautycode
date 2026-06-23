import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { useI18n } from "@/src/providers/LanguageProvider";

const VisitPlaceholder = () => {
  const { t } = useI18n();
  return (
    <View>
      <Text>{t("visits.visitPlaceholder")}</Text>
    </View>
  );
};

export default VisitPlaceholder;

const styles = StyleSheet.create({});
