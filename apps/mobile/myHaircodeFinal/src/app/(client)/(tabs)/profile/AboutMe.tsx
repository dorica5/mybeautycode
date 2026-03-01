import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import TopNav from "@/src/components/TopNav";
import { Info } from "phosphor-react-native";
import CustomAlert from "@/src/components/CustomAlert";
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
import { Profile } from "@/src/constants/types";
import { StatusBar } from "expo-status-bar";

const AboutMe = () => {
  const { profile, setProfile } = useAuth();
  const originalAboutMe = profile.about_me;
  const id = profile.id;

  const [about_me, setAboutMe] = useState(originalAboutMe);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = () => {
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    setLoading(true);
    updateProfile(
      {
        id,
        about_me,
      },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            about_me,
          }));

          setChanged(false);
          setLoading(false);
          Keyboard.dismiss();
        },
        onError: (error) => {
          setLoading(false);
          Alert.alert("Failed to update profile", error.message);
        },
      }
    );
  };

  useEffect(() => {
    setChanged(about_me !== originalAboutMe);
  }, [about_me, originalAboutMe]);

  const updateHairStructure = async (newHairStructure: string) => {
    setHairStructure(newHairStructure);
    try {
      await updateProfile({ hair_structure: newHairStructure, id: profile.id });
      console.log("Hair structure updated successfully:", newHairStructure);
    } catch (error) {
      console.error("Error updating hair type:", error.message);
    }
  };

  const updateHairThickness = async (newHairThickness: string) => {
    setHairThickness(newHairThickness);
    try {
      await updateProfile({ hair_thickness: newHairThickness, id: profile.id });
      console.log("Hair thickness updated successfully:", newHairThickness);
    } catch (error) {
      console.error("Error updating hair type:", error.message);
    }
  };

  const updategreyHairPercentage = async (newgreyHairPercentage: string) => {
    setgreyHairPercentage(newgreyHairPercentage);
    try {
      await updateProfile({
        grey_hair_percentage: newgreyHairPercentage,
        id: profile.id,
      });
      console.log(
        "Grey hair percentage updated successfully:",
        newgreyHairPercentage
      );
    } catch (error) {
      console.error("Error updating hair type:", error.message);
    }
  };

  const updateHairColor = async (newHairColor: string) => {
    setNaturalHairColor(newHairColor);
    try {
      await updateProfile({ natural_hair_color: newHairColor, id: profile.id });
      console.log("Hair color updated successfully:", newHairColor);
    } catch (error) {
      console.error("Error updating hair type:", error.message);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const scrollToInput = (y: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y, animated: true });
    }
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container} edges={["top"]}>
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
                <View style={{ alignItems: "center", marginBottom: "5%" }}>
                  <Pressable onPress={() => setAlertVisible(true)}>
                    <Info size={25} style={styles.infoIcon} />
                  </Pressable>
                  <CustomAlert
                    visible={alertVisible}
                    title="About me"
                    message={`'About me' will be visible in your profile for the hairdressers you have approved.\n\nPlease ask your hairdresser if you need help filling out this section.`}
                    onClose={() => setAlertVisible(false)}
                  />
                  <ResponsiveText size={13} style={styles.aboutme}>
                    Here you can write anything you would like your hairdresser
                    to know.
                  </ResponsiveText>
                </View>

                <View>
                  <TextInput
                    style={styles.inputDescribe}
                    multiline={true}
                    numberOfLines={4}
                    placeholder="Write something"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={(e) => {
                      const formattedText = e.replace(/\n/g, " ");
                      setAboutMe(formattedText);
                      setChanged(formattedText !== originalAboutMe);
                    }}
                    value={about_me}
                    maxLength={140}
                    textAlignVertical="top"
                    onFocus={() => {
                      scrollToInput(50);
                      setActiveDropdown(null);
                    }}
                  />
                  <View style={{ alignItems: "flex-end", marginTop: 5 }}>
                    <ResponsiveText
                      size={12}
                      style={{
                        color: about_me.length > 140 ? "red" : Colors.dark.dark,
                      }}
                    >
                      {140 - about_me.length}
                    </ResponsiveText>
                  </View>
                </View>

                <View style={styles.saveRow}>
                  <Pressable
                    onPress={() => {
                      updateUserProfile();
                      setActiveDropdown(null);
                    }}
                    disabled={loading}
                  >
                    <ResponsiveText
                      size={20}
                      weight="SemiBold"
                      style={[
                        styles.save,
                        {
                          color: changed ? "#ED1616" : "#212427",
                          opacity: 0.7,
                        },
                      ]}
                    >
                      {loading ? "Saving" : "Save"}
                    </ResponsiveText>
                  </Pressable>
                </View>

                <ResponsiveText
                  size={14}
                  weight="SemiBold"
                  style={styles.SelectionTextHeader}
                >
                  {" "}
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
                  {" "}
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
                  {" "}
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
                  {" "}
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
        </SafeAreaView>
      </View>
    </>
  );
};

export default AboutMe;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: scalePercent(5),
    marginBottom: "0%",
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: responsiveScale(50, 40),
  },
  saveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: responsiveScale(10, 8),
  },
  save: {
    marginLeft: scalePercent(70),
    fontSize: responsiveFontSize(20, 16),
  },
  infoIcon: {
    marginTop: scalePercent(4),
    color: Colors.dark.dark,
  },
  aboutme: {
    textAlign: "center",
    width: scalePercent(60),
    marginBottom: 0,
    marginTop: scalePercent(4),
    fontSize: responsiveFontSize(13, 11),
  },
  inputDescribe: {
    marginTop: "0%",
    padding: scalePercent(4),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveScale(20, 16),
    margin: "0%",
    fontFamily: "Inter-Regular",
    width: scalePercent(90),
    height: responsiveScale(120, 90),
    textAlignVertical: "top",
    color: Colors.dark.dark,
    fontSize: responsiveFontSize(16, 14),
  },
  SelectionTextHeader: {
    marginTop: responsiveScale(29, 20),
    marginVertical: responsiveScale(9, 6),
    color: Colors.dark.dark,
    fontSize: responsiveFontSize(14, 12),
  },
});
