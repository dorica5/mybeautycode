import {
  View,
  Text,
  Linking,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import React, { useCallback } from "react";
import { Colors } from "../constants/Colors";

type OpenURLProps = {
  url: string;
  children: string;
};

const OpenUrl = ({ url, children }: OpenURLProps) => {
  const handlePress = useCallback(async () => {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`);
    }
  }, [url]);

  return (
    <TouchableOpacity style={styles.buttonStyle} onPress={handlePress}>
      <Text style={styles.buttonText}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonStyle: {
    marginTop: "10%",
    backgroundColor: Colors.light.warmGreen,
    padding: 10,
    width: "100%",
    borderRadius: 20,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.dark.light,
    fontSize: 16,
  },
});

export default OpenUrl;
