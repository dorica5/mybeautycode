import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { IconProps, CaretRight, Trash } from "phosphor-react-native";
import { Colors } from "../constants/Colors";

type ProfileModalProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
  Icon: React.ComponentType<IconProps>;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const ProfileModal = ({
  bottom = false,
  top = false,
  title,
  Icon,
  ...pressableProps
}: ProfileModalProps) => {
  const iconColor = Icon === Trash ? "#F00" : "#000";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          borderTopLeftRadius: top ? 20 : 0,
          borderTopRightRadius: top ? 20 : 0,
          borderBottomLeftRadius: bottom ? 20 : 0,
          borderBottomRightRadius: bottom ? 20 : 0,
          backgroundColor: pressed
            ? Colors.dark.warmGreen
            : Colors.dark.yellowish,
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        {Icon && <Icon size={32} color={iconColor} />}
        <Text style={styles.title}>{title}</Text>
      </View>
    </Pressable>
  );
};

export default ProfileModal;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    marginHorizontal: "1%",
    padding: "3%",
  },
  subContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: 16,
    marginLeft: "10%",
  },
});
