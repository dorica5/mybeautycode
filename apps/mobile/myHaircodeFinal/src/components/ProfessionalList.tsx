import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { CheckBox } from "react-native-elements";
import { CheckCircle, Circle } from "phosphor-react-native";
import { Colors } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import {
  responsiveFontSize,
  responsiveScale,
  scale,
  scalePercent,
} from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";
import { AvatarWithSpinner } from "./avatarSpinner";

function professionChipLabel(code: string | undefined): string {
  if (!code) return "";
  if (code === "hair") return "Hair";
  if (code === "nails") return "Nails";
  if (code === "brows_lashes") return "Brows / lashes";
  return code;
}

const ProfessionalList = ({ item, isChecked, onCheck }) => {
  if (!item) return null;

  const rowId = item.link_id ?? item.id;

  return (
    <Pressable
      style={styles.container}
      onPress={() => onCheck(rowId, !isChecked)}
    >
      <View style={styles.imageAndNameContainer}>
        <AvatarWithSpinner
          uri={item?.avatar_url}
          size={responsiveScale(50, 40)}
          style={[styles.avatar, !item?.avatar_url && styles.defaultImage]}
        />

        <View style={styles.nameCol}>
          <ResponsiveText
            size={responsiveFontSize(18, 8)}
            style={styles.username}
          >
            {item?.full_name ?? "Unknown"}
          </ResponsiveText>
          {item.profession_code ? (
            <Text style={styles.professionChip}>
              {professionChipLabel(String(item.profession_code))}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.checkboxContainer}>
        <CheckBox
          checked={isChecked}
          containerStyle={styles.checkbox}
          onPress={() => onCheck(rowId, !isChecked)}
          checkedIcon={
            <CheckCircle
              size={responsiveScale(28, 22)}
              color={Colors.dark.dark}
            />
          }
          uncheckedIcon={
            <Circle
              size={responsiveScale(28, 22)}
              color={Colors.dark.dark}
            />
          }
        />
      </View>
    </Pressable>
  );
};


export default ProfessionalList

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scalePercent(2),
  },
  imageAndNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: 'lightgrey',
  },
  nameCol: {
    marginLeft: scalePercent(3),
    flexShrink: 1,
  },
  username: {},
  professionChip: {
    ...Typography.bodySmall,
    marginTop: scale(2),
    color: Colors.dark.dark,
    opacity: 0.85,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  
  },
  checkbox: {
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  defaultImage: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },
});