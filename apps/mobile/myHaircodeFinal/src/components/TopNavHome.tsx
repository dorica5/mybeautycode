import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

type TopNavProps = {
  title: string;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  loading?: boolean;
};

const TopNavHome = ({
  title,
  showSaveButton = false,
  saveChanged = false,
  loading = false,
  saveAction,
  titleStyle,
}: TopNavProps) => {
  return (
    <View style={styles.topNavHome}>

      {/* Centered Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
      </View>

      {/* Save button or placeholder */}
      {showSaveButton ? (
        <Pressable onPress={saveAction} disabled={loading}>
          <Text
            style={[
              styles.save,
              { color: saveChanged ? "#ED1616" : "rgba(33, 36, 39, 0.2)" },
            ]}
          >
            Save
          </Text>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

export default TopNavHome;

const styles = StyleSheet.create({
  topNavHome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1%",
    position: "relative", // For the title to be positioned absolutely
  },
 
  titleContainer: {
    position: "absolute", // Absolute position to center the title
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center", // Center the title vertically
    alignItems: "center", // Center the title horizontally
    pointerEvents: "none", // Allow the back and save buttons to remain clickable
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
  },
  save: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
  },
  placeholder: {
    width: 50,
  },
});
