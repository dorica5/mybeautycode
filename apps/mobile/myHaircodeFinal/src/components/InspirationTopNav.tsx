import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";

type TopNavProps = {
  title: string;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  loading?: boolean;
  goHome?: () => void | undefined;
};

const TopNav = ({ title, saveAction, titleStyle, goHome }: TopNavProps) => {
  return (
    <View style={styles.topNav}>
      <Pressable
        onPress={() => {
          if (goHome == undefined) {
            router.back();
          } else {
            goHome();
          }
        }}
      >
        <CaretLeft size={32} />
      </Pressable>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
    </View>
  );
};

export default TopNav;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    padding: "1%",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
    marginLeft: "23%",
  },
  save: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
  },
});
