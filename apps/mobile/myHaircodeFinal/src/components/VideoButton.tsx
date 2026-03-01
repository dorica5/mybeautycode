import { Pressable, StyleSheet, View } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef } from "react";
import { VideoCamera } from "phosphor-react-native";
import { router } from "expo-router";

const VideoButton = forwardRef<View | null, { icon: typeof VideoCamera }>(
  ({ icon: Icon, ...pressableProps }, ref) => {
    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        style={styles.videoCamera}
        onPress={() => router.push("/haircodes/qr_scanner")}
      >
        <Icon size={32} />
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  videoCamera: {
    backgroundColor: Colors.light.yellowish,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    margin: 10,
    width: 70,
    height: 70,
  },
});

export default VideoButton;
