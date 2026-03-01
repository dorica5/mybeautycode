import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef } from "react";
import { IconProps, Trash } from "phosphor-react-native";

type ButtonProps = {
  text: string;
  margin?: boolean;
  width?: boolean;
  Icon?: React.ComponentType<IconProps>;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const HelperRectangle = forwardRef<View | null, ButtonProps>(
  ({ text, Icon, margin = true, style, ...pressableProps }, ref) => {
    const iconColor = Icon === Trash ? "#F00" : "#000";
    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        style={[
          styles.container,
          margin ? styles.marginAllSides : styles.margin,
          style,
        ]}
      >
        <View style={styles.subContainer}>
          {Icon && (
            <View style={styles.iconContainer}>
              <Icon size={15} color={iconColor} />
            </View>
          )}
          <Text style={styles.text}>{text}</Text>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.yellowish, 
    height: 30, 
    width: 30, 
    borderRadius: 8, 
    borderColor: Colors.dark.warmGreen, 
    borderWidth: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 0, 
  },
  text: {
    fontSize: 14, // Smaller text size for the small rectangle
    color: Colors.dark.dark,
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  marginAllSides: {
    margin: 10, // Optional margin for spacing around the rectangle
  },
  margin: {},
  subContainer: {
    flexDirection: "row", // Align icon and text in a row
    justifyContent: "center", // Center them horizontally
    alignItems: "center", // Align them vertically
    width: "100%", // Make the width of subContainer the same as the container
  },
  iconContainer: {
    marginRight: 5, // Space between icon and text
  },
});

export default HelperRectangle;
