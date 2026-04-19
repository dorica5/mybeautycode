import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useRef } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import TopNav from "@/src/components/TopNav";
import Dropdown from "@/src/components/Dropdown";
import {
  greyHairPercentageItems,
  hairStructureItems,
  hairThicknessItems,
  naturalHairColorItems,
} from "@/assets/data/items";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  responsiveFontSize,
  responsiveScale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { MintProfileScreenShell } from "@/src/components/MintProfileScreenShell";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";

/**
 * Client hair baseline / About Me — original dropdown layout; sage bg + section title
 * typography match professional profile editors (`Typography.label`, `primaryBlack`).
 */
const HairProfile = () => {
  const { profile } = useAuth();

  const [hair_structure, setHairStructure] = useState(
    profile?.hair_structure || ""
  );
  const [hair_thickness, setHairThickness] = useState(
    profile?.hair_thickness || ""
  );
  const [grey_hair_percentage, setgreyHairPercentage] = useState(
    profile?.grey_hair_percentage || ""
  );
  const [natural_hair_color, setNaturalHairColor] = useState(
    profile?.natural_hair_color || ""
  );

  const scrollViewRef = useRef<ScrollView>(null);

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const updateHairStructure = async (newHairStructure: string) => {
    setHairStructure(newHairStructure);
    try {
      await updateProfile({ hair_structure: newHairStructure, id: profile.id });
    } catch (error) {
      console.error(
        "Error updating hair structure:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const updateHairThickness = async (newHairThickness: string) => {
    setHairThickness(newHairThickness);
    try {
      await updateProfile({ hair_thickness: newHairThickness, id: profile.id });
    } catch (error) {
      console.error(
        "Error updating hair thickness:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const updategreyHairPercentage = async (newgreyHairPercentage: string) => {
    setgreyHairPercentage(newgreyHairPercentage);
    try {
      await updateProfile({
        grey_hair_percentage: newgreyHairPercentage,
        id: profile.id,
      });
    } catch (error) {
      console.error(
        "Error updating grey hair %:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const updateHairColor = async (newHairColor: string) => {
    setNaturalHairColor(newHairColor);
    try {
      await updateProfile({ natural_hair_color: newHairColor, id: profile.id });
    } catch (error) {
      console.error(
        "Error updating hair color:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <MintProfileScreenShell>
      <TopNav title="About me" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={true}
          keyboardDismissMode="interactive"
        >
          <Pressable onPress={dismissKeyboard} style={{ flex: 1 }}>
            <ResponsiveText
              size={14}
              weight="SemiBold"
              style={styles.SelectionTextHeader}
            >
              Hair structure
            </ResponsiveText>

            <Dropdown
              onSelect={updateHairStructure}
              listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
              zIndex={4000}
              zIndexInverse={3000}
              item={hairStructureItems}
              initialValue={profile.hair_structure}
            />
            <ResponsiveText
              size={14}
              weight="SemiBold"
              style={styles.SelectionTextHeader}
            >
              Hair thickness
            </ResponsiveText>
            <Dropdown
              onSelect={updateHairThickness}
              listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
              zIndex={4000}
              zIndexInverse={3000}
              item={hairThicknessItems}
              initialValue={profile.hair_thickness}
            />

            <ResponsiveText
              size={14}
              weight="SemiBold"
              style={styles.SelectionTextHeader}
            >
              Natural hair color
            </ResponsiveText>
            <Dropdown
              onSelect={updateHairColor}
              listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
              zIndex={4000}
              zIndexInverse={3000}
              item={naturalHairColorItems}
              initialValue={profile.natural_hair_color}
            />

            <ResponsiveText
              size={14}
              weight="SemiBold"
              style={styles.SelectionTextHeader}
            >
              Grey hair percentage
            </ResponsiveText>
            <Dropdown
              onSelect={updategreyHairPercentage}
              listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
              zIndex={4000}
              zIndexInverse={3000}
              item={greyHairPercentageItems}
              initialValue={profile.grey_hair_percentage}
            />

            <View style={{ height: verticalScale(100) }} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default HairProfile;

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: responsiveScale(50, 40),
    marginHorizontal: scalePercent(5),
    marginBottom: "0%",
  },
  /** Section labels: pro-style (`Typography.label`) + black on sage. */
  SelectionTextHeader: {
    ...Typography.label,
    marginTop: responsiveScale(29, 20),
    marginVertical: responsiveScale(9, 6),
    color: primaryBlack,
    fontSize: responsiveFontSize(14, 12),
  },
});
