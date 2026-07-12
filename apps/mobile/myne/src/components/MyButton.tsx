/* eslint-disable react/react-in-jsx-scope */
import { Pressable, StyleSheet, View } from "react-native";
import { Colors } from "@/src/constants/Colors";
import { forwardRef } from "react";
import { IconProps, Trash } from "phosphor-react-native";
import { responsiveScale, responsiveMargin, responsivePadding } from "@/src/utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

type ButtonProps = {
  text: string;
  textSize?: number;
  textTabletSize?: number;
  margin?: boolean;
  width?: boolean;
  Icon?: React.ComponentType<IconProps>;
  reject?: boolean,
  textStyle?: object;
  iconStyle?: object;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

// eslint-disable-next-line react/display-name
const MyButton = forwardRef<View | null, ButtonProps>(
  ({ 
    text, 
    textSize = 16,
    textTabletSize,
    Icon, 
    margin = true, 
    style, 
    reject = false, 
    textStyle, 
    iconStyle, 
    ...pressableProps 
  }, ref) => {
    const iconColor = Icon === Trash ? "#F00" : "#000";
    return (
      // eslint-disable-next-line react/react-in-jsx-scope
      <Pressable
        ref={ref}
        {...pressableProps}
        style={({ pressed }) => [
          styles.container,
          margin ? styles.marginAllSides : styles.margin,
          style,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.subContainer}>
          {Icon && (
            <View style={[styles.iconContainer, iconStyle]}>
              <Icon size={responsiveScale(24)} color={iconColor} />
            </View>
          )}
          <ResponsiveText 
            weight="SemiBold" 
            size={textSize} 
            tabletSize={textTabletSize}
            style={[styles.text, {color: reject? "red" : Colors.dark.dark}, textStyle]} 
          >
            {text}
          </ResponsiveText>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.warmGreen,
    paddingVertical: responsivePadding(14, 8),
    paddingHorizontal: responsivePadding(24),
    alignItems: "center",
    borderRadius: responsiveScale(100),
  },
  text: {
    textAlign: "center",
  },
  marginAllSides: {
    marginVertical: responsiveMargin(16),
  },
  margin: {},
  subContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: "relative",
    left: responsiveScale(20),
  },
});

export default MyButton;