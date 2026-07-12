import { Pressable, StyleSheet, View, Image } from "react-native";
import { Colors } from "@constants/Colors";
import { forwardRef, useEffect, useState } from "react";
import { Camera } from "phosphor-react-native";
import { router } from "expo-router";
import { useCameraContext } from "../providers/CameraProvider";

type CameraButtonProps = {
  icon: typeof Camera;
  mode: string;
};

const CameraButton = forwardRef<View | null, CameraButtonProps>(
  ({ icon: Icon, mode, ...pressableProps }, ref) => {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const { setOnMediaCaptured, onMediaCaptured } = useCameraContext();

    useEffect(() => {
      if (Array.isArray(onMediaCaptured) && onMediaCaptured.length > 0) {
        const url = onMediaCaptured[onMediaCaptured.length - 1].uri;
        setCapturedImage(url);
      }

      console.log("On Media Captured", onMediaCaptured);
      console.log("Captured image", capturedImage);
    }, [onMediaCaptured]);

    const handlePress = () => {
      router.push({
        pathname: "/visits/qr_scanner",
        params: { mode },
      });
    };

    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        style={styles.camera}
        onPress={handlePress}
      >
        {capturedImage ? (
          <Image source={{ uri: capturedImage }} style={styles.image} />
        ) : (
          <Icon size={32} />
        )}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  camera: {
    backgroundColor: Colors.light.yellowish,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    margin: 10,
    width: 70,
    height: 70,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
});

export default CameraButton;
