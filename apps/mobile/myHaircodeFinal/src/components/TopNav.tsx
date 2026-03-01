import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { 
  responsiveScale, 
  responsivePadding,
} from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";

type TopNavProps = {
  title: string;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  loading?: boolean;
};

const TopNav = ({
  title,
  showSaveButton = false,
  saveChanged = false,
  loading = false,
  saveAction,
  titleStyle,
}: TopNavProps) => {
  return (
    <View style={styles.topNav}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <CaretLeft size={responsiveScale(32)} />
      </Pressable>
      
      <ResponsiveText 
        size={20} 
        tabletSize={16} 
        weight="SemiBold" 
        style={[styles.title, titleStyle]}
      >
        {title}
      </ResponsiveText>

      {showSaveButton ? (
        <Pressable onPress={saveAction} disabled={loading} style={styles.saveButton}>
          <ResponsiveText 
            size={20} 
            tabletSize={16} 
            weight="SemiBold"
            style={[
              styles.saveText,
              { color: saveChanged ? "#ED1616" : "rgba(33, 36, 39, 0.2)" },
            ]}
          >
            {loading ? "Saving" : "Save"}
          </ResponsiveText>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

export default TopNav;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsivePadding(20,8),
    paddingHorizontal: responsivePadding(4),
  },
  backButton: {
    padding: responsivePadding(10, 4),
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    padding: responsivePadding(10),
  },
  saveText: {
    // Save button text styling
  },
  placeholder: {
    width: responsiveScale(50),
    padding: responsivePadding(10),
  },
});