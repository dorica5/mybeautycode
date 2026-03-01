import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Modal, 
  Dimensions, 
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableWithoutFeedback
} from 'react-native';
import { XCircle } from 'phosphor-react-native'; 
import { Colors } from "@/src/constants/Colors";

const screenHeight = Dimensions.get('window').height;

interface SmallDraggableModalProps {
  isVisible: boolean;
  onClose: () => void;
  onModalHide?: () => void;              // <<<<<< ADDED
  modalHeight: number;
  renderContent: React.ReactNode;
  preview?: boolean;
  done?: boolean;
}

const SmallDraggableModal: React.FC<SmallDraggableModalProps> = ({ 
  isVisible, 
  onClose, 
  onModalHide,                           // <<<<<< ADDED
  modalHeight, 
  renderContent, 
  preview = true, 
  done = true 
}) => {
  const pan = useRef(new Animated.Value(screenHeight)).current;
  const [visible, setVisible] = useState(isVisible);
  const isScrollAtTop = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastGestureValue = useRef(screenHeight * 0.1);

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      Animated.timing(pan, {
        toValue: screenHeight * 0.1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      lastGestureValue.current = screenHeight * 0.1;
    } else {
      Animated.timing(pan, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        if (onModalHide) onModalHide();  // <<<<<< CALL HERE
      });
      lastGestureValue.current = screenHeight;
    }
  }, [isVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollAtTop.current = event.nativeEvent.contentOffset.y <= 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy, dx } = gestureState;
        return isScrollAtTop.current && 
               Math.abs(dy) > Math.abs(dx) && 
               dy > 0;
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = lastGestureValue.current + gestureState.dy;
        if (newY >= screenHeight * 0.1) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (gestureState.dy > 150) {
          Animated.timing(pan, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            onClose();
            if (onModalHide) onModalHide();  // <<<<<< ALSO CALL HERE
          });
          lastGestureValue.current = screenHeight;
        } else {
          Animated.spring(pan, {
            toValue: screenHeight * 0.1,
            useNativeDriver: true,
            tension: 100,
            friction: 12
          }).start();
          lastGestureValue.current = screenHeight * 0.1;
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackground}>
          <Animated.View
            style={[
              styles.modalContent,
              { height: modalHeight, transform: [{ translateY: pan }] }
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <XCircle size={32} color={Colors.dark.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              scrollEventThrottle={16}
              onScroll={handleScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              {...panResponder.panHandlers}
            >
              <View style={styles.contentContainer}>
                {renderContent}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: Colors.light.light,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default SmallDraggableModal;
