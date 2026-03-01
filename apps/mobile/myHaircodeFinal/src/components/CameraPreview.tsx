import React from "react";
import {
  ImageBackground,
  View,
  StyleSheet,
  Pressable,
  Text,
} from "react-native";

export const CameraPreview = ({ photo, retakePicture, savePic }: any) => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: photo && photo.uri }}
        style={styles.imageBackground}
      >
        <Pressable style={styles.retake} onPress={retakePicture}>
          <Text style={styles.retakeText}>Retake</Text>
        </Pressable>
        <Pressable style={styles.done} onPress={savePic}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    width: "100%",
    height: "100%",
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },
  retake: {
    position: "absolute",
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 5,
  },
  retakeText: {
    color: "white",
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  done: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 5,
  },
  doneText: {
    color: "white",
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
});
