import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef } from "react";
import {
  responsiveScale,
  responsivePadding,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent,
} from "@/src/utils/responsive";

type ButtonProps = {
  text: string;
  margin?: boolean;
  width?: boolean;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const AddButton = forwardRef<View | null, ButtonProps>(
  ({ text, margin = true, style, ...pressableProps }, ref) => {
    return (
      <View style={styles.centerContainer}>
        <Pressable
          ref={ref}
          {...pressableProps}
          style={[
            styles.container,
            margin ? styles.marginAllSides : styles.margin,
            style,
          ]}
        >
          <Text style={styles.text}>{text}</Text>
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: responsivePadding(15),
    alignItems: "center",
    borderRadius: responsiveBorderRadius(100),
    borderWidth: responsiveScale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: "transparent",
    width: responsiveScale(150, 180),
  },
  text: {
    fontSize: responsiveFontSize(16, 12),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
  },
  marginAllSides: {
    margin: scalePercent(5),
  },
  margin: {},
});

export default AddButton;