import { StyleSheet, View, Pressable } from "react-native";
import React from "react";
import { IconProps, CaretRight, Trash } from "phosphor-react-native";
import { Colors } from "../constants/Colors";
import { scale, scalePercent, verticalScale } from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

type ProfileProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
  Icon: React.ComponentType<IconProps>;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const Profile = ({
  bottom = false,
  top = false,
  title,
  Icon,
  ...pressableProps
}: ProfileProps) => {
  const iconColor = Icon === Trash ? "#F00" : "#000";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          borderTopLeftRadius: top ? scale(20) : 0,
          borderTopRightRadius: top ? scale(20) : 0,
          borderBottomLeftRadius: bottom ? scale(20) : 0,
          borderBottomRightRadius: bottom ? scale(20) : 0,
          backgroundColor: pressed
            ? Colors.dark.warmGreen
            : Colors.dark.yellowish,
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        {Icon && <Icon size={scale(32)} color={iconColor} />}
        <ResponsiveText size={16} weight="SemiBold" style={styles.title}> {title}</ResponsiveText>
      </View>
      <CaretRight size={scale(32)} />
    </Pressable>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: verticalScale(2),
    marginHorizontal: scalePercent(5),
    padding: scalePercent(3),
    marginTop: scale(1),
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
