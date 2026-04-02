import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Logo from "../../assets/myHaircode_half_logo.svg";
import { XCircle } from "phosphor-react-native";
import { Colors } from "@/src/constants/Colors";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
  responsivePadding,
  responsiveBorderRadius,
  isTablet,
} from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  fromDelete?: boolean;
  onDelete?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onClose,
  fromDelete,
  onDelete,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          
          <TouchableOpacity
            style={{ position: "absolute", top: responsiveScale(20), right: responsiveScale(20), zIndex: 1000 }}
            onPress={onClose}
          >
            <XCircle size={responsiveScale(28)} color={Colors.dark.dark} />
          </TouchableOpacity>
          
          <Logo 
            width={responsiveScale(120, 150)} 
            height={responsiveScale(120, 150)} 
            style={styles.logo} 
          />
          <ResponsiveText size={18} tabletSize={14} weight="Bold" style={styles.alertTitle}>
            {title}
          </ResponsiveText>
          
          {/* White rectangle for the message */}
          <View style={styles.messageContainer}>
            <ResponsiveText size={16} tabletSize={12} style={styles.alertMessage}>
              {message}
            </ResponsiveText>
          </View>
          
          {fromDelete && (
            <View style={styles.deleteButtonsContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <ResponsiveText size={16} tabletSize={14} weight="SemiBold" style={styles.closeButtonText}>
                  Cancel
                </ResponsiveText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onDelete}>
                <ResponsiveText size={16} tabletSize={14} weight="SemiBold" style={styles.deleteButton}>
                  Delete
                </ResponsiveText>
              </TouchableOpacity>
            </View>
          )}
          
          {!fromDelete && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <ResponsiveText size={16} tabletSize={14} weight="SemiBold" style={styles.closeButtonText}>
                Got it!
              </ResponsiveText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Made darker to see better
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999, // Add high z-index
  },
  alertContainer: {
    width: scalePercent(80),
    aspectRatio: isTablet() ? 0.8 : 0.6,
    backgroundColor: Colors.dark.warmGreen,
    borderRadius: responsiveBorderRadius(10),
    padding: responsivePadding(10),
    alignItems: "center",
    borderColor: Colors.light.yellowish,
    borderWidth: responsiveScale(1),
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: responsiveScale(8),
    elevation: 8,
    zIndex: 10000, // Add high z-index
  },
  logo: {
    alignSelf: "center",
    marginTop: responsiveScale(40, 50),
  },
  deleteButtonsContainer: {
    flexDirection: "row",
    gap: responsiveScale(70, 80),
  },
  alertTitle: {
    color: Colors.dark.dark,
    marginTop: responsiveScale(40, 50),
  },
  messageContainer: {
    backgroundColor: Colors.light.light, 
    borderRadius: responsiveBorderRadius(10),
    padding: responsivePadding(20),
    marginTop: responsiveScale(20, 25),
    width: scalePercent(67), 
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: responsiveScale(8),
    elevation: 4, 
  },
  alertMessage: {
    color: Colors.dark.dark,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: Colors.light.yellowish,
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(20),
    borderRadius: responsiveBorderRadius(10),
    marginBottom: responsiveScale(10),
    marginTop: responsiveScale(20, 25),
    borderColor: Colors.dark.dark,
    borderWidth: responsiveScale(1),
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: responsiveScale(8),
    elevation: 8,
  },
  closeButtonText: {
    color: Colors.dark.dark,
  },
  deleteButton: {
    color: "red",
  },
});

export default CustomAlert;