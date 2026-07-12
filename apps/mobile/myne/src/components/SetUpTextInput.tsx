import { StyleSheet, View, TextInput } from "react-native";
import { useState } from "react";
import { Colors } from "../constants/Colors";

type SetUpTextInputProps = {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
};

const SetUpTextInput = ({
  title,
  value,
  placeholder,
  handleChangeText,
  ...props
}: SetUpTextInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={styles.container}>
      <View style={styles.textInputStyle}>
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="rgba(33, 36, 39, 0.5)"
          onChangeText={handleChangeText}
          secureTextEntry={title === "Password" && !showPassword}
          style={styles.input}
        />
      </View>
    </View>
  );
};

export default SetUpTextInput;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.yellowish,
    height: "7%",
    borderRadius: 20,
    justifyContent: "center",
    marginHorizontal: "5%",
    marginTop: "12%",
  },
  textInputStyle: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10, // Specific padding for the right, adjusted for icons
  },
  input: {
    flex: 1,
    paddingHorizontal: "8%",
    fontSize: 16,
    fontFamily: "Inter-Regular",
    color: Colors.light.dark,
  },
});
