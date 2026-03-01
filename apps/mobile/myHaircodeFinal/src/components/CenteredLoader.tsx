// src/components/CenteredLoader.tsx
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/src/constants/Colors";

const CenteredLoader = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.yellowish} />
    </View>
  );
};

export default CenteredLoader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
