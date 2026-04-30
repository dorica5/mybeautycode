import { CameraPreview } from "@/src/components/CameraPreview";
import { useCameraContext } from "@/src/providers/CameraProvider";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const QRScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const { mode } = useLocalSearchParams();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<any>(null);
  const [flashMode, setFlashMode] = useState("off");
  const [cameraReady, setCameraReady] = useState(false);
  const { setOnMediaCaptured } = useCameraContext();

  let camera: CameraView;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function closeCamera() {
    router.back();
  }

  const __handleFlashMode = () => {
    setFlashMode((prev) => (prev === "on" ? "off" : "on"));
  };

  const takePicture = async () => {
    if (!camera || !cameraReady) return;
    const options = { quality: 1, base64: true, exif: false };
    const newPhoto = await camera.takePictureAsync(options);

    setPreviewVisible(true);
    setCapturedImage(newPhoto);
  };

  const __retakePicture = () => {
    setCapturedImage(null);
    setPreviewVisible(false);
  };

  const saveMedia = () => {
    if (capturedImage && capturedImage.uri) {
      setOnMediaCaptured(capturedImage);
    } else {
      console.error("No captured image or invalid media object.");
    }
    setPreviewVisible(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {previewVisible && capturedImage ? (
        <CameraPreview
          photo={capturedImage}
          retakePicture={__retakePicture}
          savePic={saveMedia}
        />
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          flash={flashMode}
          responsiveOrientationWhenOrientationLocked={true}
          mode={mode}
          onCameraReady={() => setCameraReady(true)}
          ref={(r) => {
            camera = r;
          }}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={closeCamera}>
              <Text style={styles.text}>X</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={__handleFlashMode}
            style={[
              styles.flashStyle,
              { backgroundColor: flashMode === "off" ? "transparent" : "#fff" },
            ]}
          >
            <Text style={{ fontSize: 20 }}>⚡️</Text>
          </TouchableOpacity>
          <View style={styles.picContainer}>
            <View style={styles.picSubContainer}>
              <TouchableOpacity
                onPress={takePicture}
                style={styles.picButton}
              />
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
};
export default QRScanner;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  message: {
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  picButton: {
    width: 70,
    height: 70,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "#fff",
  },
  picContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    flex: 1,
    width: "100%",
    padding: 20,
    justifyContent: "space-between",
  },
  picSubContainer: {
    alignSelf: "center",
    flex: 1,
    alignItems: "center",
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    marginHorizontal: "10%",
    marginVertical: "15%",
  },
  button: {
    flex: 1,
    alignSelf: "flex-start",
    alignItems: "flex-end",
  },
  text: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    color: "white",
  },
  flashStyle: {
    position: "absolute",
    left: "5%",
    top: "8%",
    borderRadius: 20,
    height: 25,
    width: 25,
  },
});
