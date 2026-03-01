import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { 
  responsiveScale, 
  responsivePadding,
  responsiveFontSize
} from "@/src/utils/responsive";

type TopNavGalleryProps = {
  title: string;
  secondTitle: string;
  titleStyle?: object;
};

const TopNavGallery = ({
  title,
  secondTitle,
  titleStyle,
}: TopNavGalleryProps) => {
  return (
    <View style={styles.topNav}>
      <Pressable onPress={() => router.back()}>
        <CaretLeft size={responsiveScale(32)} />
      </Pressable>
      
        <Text style={[styles.title, titleStyle]}>{title}</Text>
      
    </View>
  );
};

export default TopNavGallery;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsivePadding(20),
    paddingHorizontal: responsivePadding(20),
  },
  title: {
    fontSize: responsiveFontSize(22, 14),
    fontFamily: "Inter-SemiBold",
  },

  number: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(16, 14),
    textAlign: "center",
  },
  
});