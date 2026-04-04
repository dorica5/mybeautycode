/* eslint-disable react/display-name */
import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colors } from "../constants/Colors";
import RemoteImage from "./RemoteImage";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent,
} from "../utils/responsive";
import { AvatarWithSpinner } from "./avatarSpinner";

type HaircodeCardProps = {
  name: string;
  date: string;
  salon_name: string;
  profilePicture?: string; // Make profilePicture optional
  onPress: () => void;
};

const HaircodeCard = React.memo(
  ({ name, date, profilePicture, salon_name, onPress }: HaircodeCardProps) => {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <Text style={styles.nameText}>
          {name}
          {salon_name && `, ${salon_name}`}
        </Text>

        <View style={styles.subcontainer}>
          <Text style={styles.dateText}>{date}</Text>
          <AvatarWithSpinner
            uri={profilePicture}
            size={responsiveScale(75)}
            style={[styles.image, !profilePicture && styles.defaultImage]}
          />
        </View>
      </Pressable>
    );
  }
);

export default HaircodeCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.yellowish,
    paddingTop: responsiveScale(20),
    paddingBottom: responsiveScale(32),
    marginHorizontal: responsivePadding(16),
    marginTop: responsiveMargin(20),
    borderRadius: responsiveBorderRadius(20),
    width: scalePercent(93),
    alignSelf: 'center',
    marginBottom: responsiveMargin(10),

    // Shadow for iOS
    shadowColor: Colors.dark.dark,
    shadowOffset: { 
      width: 0, 
      height: responsiveScale(4)
    },
    shadowOpacity: 0.25,
    shadowRadius: responsiveScale(8),

    // Shadow for Android
    elevation: 8,
  },
  subcontainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: responsivePadding(12),
  },
  image: {
    marginTop: responsiveScale(-25),
    width: responsiveScale(75),
    aspectRatio: 1,
    borderRadius: responsiveScale(37.5),
  },
  defaultImage: {
    marginTop: responsiveScale(-25),
    width: responsiveScale(75),
    aspectRatio: 1,
    borderRadius: responsiveScale(37.5),
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },
  nameText: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(18, 16),
    alignItems: "center",
    marginHorizontal: responsivePadding(12),
    marginTop: responsiveMargin(12),
  },
  dateText: {
    marginLeft: responsiveMargin(4),
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(16, 14),
    marginHorizontal: responsivePadding(12),
  },
});