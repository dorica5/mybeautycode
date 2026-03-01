import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import React, { useState } from "react";
import { Colors } from "../constants/Colors";
import { CheckCircle, Eye, EyeClosed } from "phosphor-react-native";
import {
  moderateScale,
  scale,
  scalePercent,
  verticalScale,
} from "../utils/responsive";

type MyTextInputProps = TextInputProps & {
  title: string;
  value: string;
  handleChangeText: (text: string) => void;
  style?: object;
  checkmark?: boolean;
  containerStyle?: object;
};

const MyTextinput = ({
  title,
  value,
  handleChangeText,
  style,
  checkmark,
  containerStyle,
  ...rest
}: MyTextInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.textInputStyle}>
        <TextInput
          value={value}
          placeholderTextColor="rgba(33, 36, 39, 0.5)"
          onChangeText={handleChangeText}
          secureTextEntry={title === "Password" && !showPassword}
          style={[
            styles.input,
            // Adjust padding when checkmark is shown to prevent text overlap
            checkmark && styles.inputWithCheckmark,
            style
          ]}
          submitBehavior="submit"
          {...rest}
        />

        {title === "Password" && value !== "" ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            accessible
            accessibilityLabel="Toggle password visibility"
            style={styles.eyeIcon}
          >
            {!showPassword ? (
              <EyeClosed size={scale(20)} color={Colors.dark.dark} />
            ) : (
              <Eye size={scale(20)} color={Colors.dark.dark} />
            )}
          </TouchableOpacity>
        ) : null}
        
        {checkmark && (
          <CheckCircle
            size={scale(20)}
            color="green"
            style={styles.checkIcon}
          />
        )}
      </View>
    </View>
  );
};

export default MyTextinput;

const styles = StyleSheet.create({
  container: {
    marginTop: scalePercent(5),
    width: "100%",
    backgroundColor: Colors.light.light,
    height: verticalScale(40),
    borderRadius: scale(22),
    justifyContent: "center",
  },
  textInputStyle: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
    paddingRight: scale(20),
    position: "relative",
    height: "100%", // Ensure full height for proper centering
  },
  input: {
    flex: 1,
    paddingHorizontal: scalePercent(6),
    fontSize: moderateScale(15),
    fontFamily: "Inter-Regular",
    color: Colors.light.dark,
  },
  inputWithCheckmark: {
    paddingRight: scale(45),
  },
  checkIcon: {
    position: "absolute",
    right: scale(15),
    top: "50%",
    transform: [{ translateY: verticalScale(-12) }],
  },
  eyeIcon: {
    position: "absolute",
    right: scale(15),
    top: "50%",
    transform: [{ translateY: verticalScale(-12) }], 
  },
});