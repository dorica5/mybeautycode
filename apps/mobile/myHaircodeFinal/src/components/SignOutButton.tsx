import { Pressable, StyleSheet,  View } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef } from "react";
import { scale, scalePercent } from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

type ButtonProps = {
  text: string;
  margin?: boolean;
  width?: boolean;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const SignOutButton = forwardRef<View | null, ButtonProps>(
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
          <ResponsiveText size={16} weight="SemiBold" style={styles.text}>{text}</ResponsiveText>
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
  },
  container: {
    padding: scale(14),
    alignItems: "center",
    borderRadius: scale(100),
    borderWidth: scale(2),
    borderColor: Colors.light.warmGreen, // Outline color
    backgroundColor: "transparent",
    width: scale(145), 
  },
  text: {
    color: Colors.dark.dark,
    textAlign: "center",
   
  },
  marginAllSides: {
    margin: scalePercent(5),
  },
});

export default SignOutButton;
