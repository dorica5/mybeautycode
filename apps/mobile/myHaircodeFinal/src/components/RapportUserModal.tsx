import { StyleSheet, View, Pressable } from "react-native";
import React from "react";
import { Colors } from "../constants/Colors";
import { 
  responsiveScale, 
  responsivePadding, 
  responsiveMargin, 
  responsiveBorderRadius 
} from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

type RapportUserProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const RapportUserModal = ({
  bottom = false,
  top = false,
  title,
  ...pressableProps
}: RapportUserProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          borderTopLeftRadius: top ? responsiveBorderRadius(20) : 0,
          borderTopRightRadius: top ? responsiveBorderRadius(20) : 0,
          borderBottomLeftRadius: bottom ? responsiveBorderRadius(20) : 0,
          borderBottomRightRadius: bottom ? responsiveBorderRadius(20) : 0,
          backgroundColor: pressed
            ? Colors.dark.warmGreen
            : Colors.dark.yellowish,
          marginTop: bottom && top ? responsiveMargin(16) : responsiveMargin(4),
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        <ResponsiveText
          size={16}
          tabletSize={14}
          weight="SemiBold"
          style={[
            styles.title,
            bottom && top ? { color: "#F00" } : {},
          ]}
        >
          {title}
        </ResponsiveText>
      </View>
    </Pressable>
  );
};

export default RapportUserModal;

const styles = StyleSheet.create({
  container: {
    marginVertical: responsiveMargin(4),
    marginHorizontal: responsiveScale(4), // Convert percentage to responsive scale
    padding: responsivePadding(12), // Convert percentage to fixed responsive padding
  },
  subContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  title: {
    color: "#333",
  },
});