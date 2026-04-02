import { StyleSheet, View, Pressable, Text } from "react-native";
import React from "react";
import { IconProps, CaretRight, Trash } from "phosphor-react-native";
import { Colors } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import { scale, scalePercent, responsiveScale } from "../utils/responsive";

type ProfileProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
  Icon: React.ComponentType<IconProps>;
  /** Mint-style tiles on client profile; default uses yellowish (hairdresser). */
  tileStyle?: "default" | "light";
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const Profile = ({
  bottom = false,
  top = false,
  title,
  Icon,
  tileStyle = "default",
  ...pressableProps
}: ProfileProps) => {
  const iconColor = Icon === Trash ? "#F00" : "#000";
  const idleBg =
    tileStyle === "light" ? Colors.dark.primaryWhite : Colors.dark.yellowish;
  const pressedBg =
    tileStyle === "light" ? Colors.dark.secondaryGreen : Colors.dark.warmGreen;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          borderTopLeftRadius: top ? scale(20) : 0,
          borderTopRightRadius: top ? scale(20) : 0,
          borderBottomLeftRadius: bottom ? scale(20) : 0,
          borderBottomRightRadius: bottom ? scale(20) : 0,
          backgroundColor: pressed ? pressedBg : idleBg,
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        {Icon && <Icon size={24} color={iconColor} />}
        <Text style={[Typography.bodyLarge, styles.title]}>{title}</Text>
      </View>
      <CaretRight size={24} color={iconColor} />
    </Pressable>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: scalePercent(5),
    marginBottom: responsiveScale(6,6),
    padding: scalePercent(5),
  },
  subContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  title: {
    marginLeft: scalePercent(3),
  },
});
