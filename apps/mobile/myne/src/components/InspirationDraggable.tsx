import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponderGestureState,
} from "react-native";
import { Colors } from "../constants/Colors";

const screenHeight = Dimensions.get("window").height;

interface InspirationDraggableProps {
  isVisible: boolean;
  onClose: () => void;
  modalHeight: string | number;
  renderContent: React.ReactNode;
}

const InspirationDraggable: React.FC<InspirationDraggableProps> = ({
  isVisible,
  onClose,
  modalHeight,
  renderContent,
}) => {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      Animated.spring(translateY, {
        toValue: screenHeight * 0.1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        const { dy, dx } = gestureState;
        return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5;
      },
      onPanResponderGrant: () => {
        translateY.extractOffset();
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const { dy } = gestureState;
        if (dy >= 0) {
          translateY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        translateY.flattenOffset();
        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          // Added velocity check
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: screenHeight * 0.1,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const backgroundOpacity = translateY.interpolate({
    inputRange: [screenHeight * 0.1, screenHeight],
    outputRange: [0.6, 0],
    extrapolate: "clamp",
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.modalBackground,
            {
              backgroundColor: translateY.interpolate({
                inputRange: [screenHeight * 0.1, screenHeight],
                outputRange: ["rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0)"],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  height: modalHeight,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View {...panResponder.panHandlers} style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
              <View style={styles.contentContainer}>{renderContent}</View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );

}
const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.light.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handleContainer: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: Colors.light.light,
    zIndex: 1,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default InspirationDraggable;