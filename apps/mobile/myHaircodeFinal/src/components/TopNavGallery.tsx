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
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <CaretLeft size={responsiveScale(32)} color="#212427" />
      </Pressable>
      <View style={styles.titleBlock}>
        <Text
          style={[styles.title, titleStyle]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {secondTitle ? (
          <Text style={styles.secondTitle} numberOfLines={1}>
            {secondTitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.topNavSpacer} />
    </View>
  );
};

export default TopNavGallery;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsivePadding(16),
    paddingHorizontal: responsivePadding(20),
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
  },
  topNavSpacer: {
    width: responsiveScale(32),
  },
  title: {
    fontSize: responsiveFontSize(22, 14),
    fontFamily: "Inter-SemiBold",
    color: "#212427",
    textAlign: "center",
  },
  secondTitle: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(15, 13),
    color: "#212427",
    opacity: 0.75,
    textAlign: "center",
    marginTop: responsivePadding(4),
  },
  number: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(16, 14),
    textAlign: "center",
  },
});