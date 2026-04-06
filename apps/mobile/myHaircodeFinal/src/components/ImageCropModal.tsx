import React, { useRef, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CropZoom, useImageResolution, type CropZoomType } from "react-native-zoom-toolkit";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { X, Check } from "phosphor-react-native";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
} from "@/src/utils/responsive";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
/** Match preview carousel height so post-crop images frame like the crop UI. */
export const IMAGE_CROP_VIEWPORT_HEIGHT_RATIO = 0.6;
const CROP_AREA_WIDTH = SCREEN_WIDTH;
const CROP_AREA_HEIGHT = SCREEN_HEIGHT * IMAGE_CROP_VIEWPORT_HEIGHT_RATIO;

// Overlay component that shows the crop area with darkened borders and corner indicators
const CropOverlay = ({ cropSize }: { cropSize: { width: number; height: number } }) => {
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;
  const halfW = cropSize.width / 2;
  const halfH = cropSize.height / 2;

  // Corner positions
  const left = centerX - halfW;
  const right = centerX + halfW;
  const top = centerY - halfH;
  const bottom = centerY + halfH;

  const CORNER_SIZE = 20;
  const CORNER_THICKNESS = 3;

  const path = useMemo(() => {
    // Create path: full screen rect with rectangular hole cut out
    const commands = [
      `M 0 0`,
      `L ${SCREEN_WIDTH} 0`,
      `L ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`,
      `L 0 ${SCREEN_HEIGHT}`,
      `Z`,
      // Inner rectangle (counter-clockwise to create hole)
      `M ${left} ${top}`,
      `L ${left} ${bottom}`,
      `L ${right} ${bottom}`,
      `L ${right} ${top}`,
      `Z`,
    ].join(" ");

    return Skia.Path.MakeFromSVGString(commands)!;
  }, [cropSize, left, top, right, bottom]);

  const cornerStyle = {
    position: "absolute" as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#fff",
  };

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} pointerEvents="none">
      <Canvas style={{ position: "absolute", width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
        <Path path={path} color="rgba(0, 0, 0, 0.6)" />
      </Canvas>

      {/* Top-left corner */}
      <View style={[cornerStyle, { left, top, borderLeftWidth: CORNER_THICKNESS, borderTopWidth: CORNER_THICKNESS }]} />

      {/* Top-right corner */}
      <View style={[cornerStyle, { left: right - CORNER_SIZE, top, borderRightWidth: CORNER_THICKNESS, borderTopWidth: CORNER_THICKNESS }]} />

      {/* Bottom-left corner */}
      <View style={[cornerStyle, { left, top: bottom - CORNER_SIZE, borderLeftWidth: CORNER_THICKNESS, borderBottomWidth: CORNER_THICKNESS }]} />

      {/* Bottom-right corner */}
      <View style={[cornerStyle, { left: right - CORNER_SIZE, top: bottom - CORNER_SIZE, borderRightWidth: CORNER_THICKNESS, borderBottomWidth: CORNER_THICKNESS }]} />
    </View>
  );
};

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onCropComplete: (croppedUri: string) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  visible,
  imageUri,
  onCancel,
  onCropComplete,
}) => {
  const cropRef = useRef<CropZoomType>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get image resolution using the hook from zoom-toolkit
  const { resolution } = useImageResolution({ uri: imageUri });

  const cropSize = {
    width: CROP_AREA_WIDTH,
    height: CROP_AREA_HEIGHT,
  };

  const handleCrop = async () => {
    if (!cropRef.current || !resolution) return;

    setIsProcessing(true);

    try {
      // Get crop coordinates from CropZoom - use 1200px for high quality output
      const result = cropRef.current.crop(1200);

      const actions: any[] = [];

      // Add resize if provided
      if (result.resize) {
        actions.push({ resize: result.resize });
      }

      // Add crop action
      actions.push({
        crop: {
          originX: Math.round(result.crop.originX),
          originY: Math.round(result.crop.originY),
          width: Math.round(result.crop.width),
          height: Math.round(result.crop.height),
        },
      });

      const manipulatedImage = await manipulateAsync(
        imageUri,
        actions,
        { compress: 0.9, format: SaveFormat.JPEG }
      );

      setIsProcessing(false);
      onCropComplete(manipulatedImage.uri);
    } catch (error) {
      console.error("Error cropping image:", error);
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  // Don't render until we have the image resolution
  if (!resolution) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* CropZoom first (bottom layer) */}
          <View style={styles.cropAreaContainer}>
            <CropZoom
              ref={cropRef}
              cropSize={cropSize}
              resolution={resolution}
              minScale={1}
              maxScale={3}
              OverlayComponent={() => <CropOverlay cropSize={cropSize} />}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </CropZoom>
          </View>

          {/* Header AFTER CropZoom (top layer) - always visible */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.headerButton}>
              <X size={responsiveScale(28)} color="#fff" weight="bold" />
            </Pressable>
            <Text style={styles.headerTitle}>Adjust Image</Text>
            <Pressable
              onPress={handleCrop}
              style={styles.headerButton}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={responsiveScale(28)} color="#fff" weight="bold" />
              )}
            </Pressable>
          </View>

          {/* Instructions at bottom - always visible */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Pinch to zoom • Drag to reposition
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(15),
    paddingTop: responsivePadding(50),
  },
  headerButton: {
    padding: responsivePadding(8),
  },
  headerTitle: {
    fontSize: responsiveFontSize(18, 16),
    fontFamily: "Inter-SemiBold",
    color: "#fff",
  },
  cropAreaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  instructions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: responsivePadding(20),
    alignItems: "center",
  },
  instructionsText: {
    fontSize: responsiveFontSize(14, 12),
    fontFamily: "Inter-Regular",
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export default ImageCropModal;
