import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef } from "react";
import { useMark } from "@/src/providers/MarkProvider";

type ButtonProps = {
  margin?: boolean;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const MarkCancelButton = forwardRef<View | null, ButtonProps>(
  ({ margin = true, ...pressableProps }, ref) => {
    const { buttonText, setButtonText, setMarked } = useMark();

    const handlePress = () => {
      const newButtonText = buttonText === "Mark images" ? "Cancel" : "Mark images";
      setButtonText(newButtonText);
      setMarked(newButtonText === "Cancel"); 
    };

    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        onPress={handlePress}
        style={[styles.container, margin ? styles.marginAllSides : styles.margin]}
      >
        <View style={styles.subContainer}>
          <Text style={styles.text}>{buttonText}</Text>
        </View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#B1B7B7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
    width: 120,
    marginLeft: "80%",
  },
  text: {
    fontSize: 12,
    color: Colors.light.light,
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  marginAllSides: {
    margin: "0%",
  },
});

export default MarkCancelButton;
