import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopNav from "@/src/components/TopNav";
import MyTextinput from "@/src/components/MyTextinput";
import { useSetup } from "@/src/providers/SetUpProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { router } from "expo-router";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import { UploadSimple } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import RemoteImage from "@/src/components/RemoteImage";
import MyButton from "@/src/components/MyButton";
import { Colors } from "@/src/constants/Colors";
import Dropdown from "@/src/components/Dropdown";
import { Info } from "phosphor-react-native";
import CustomAlert from "@/src/components/CustomAlert";
import {
  greyHairPercentageItems,
  hairStructureItems,
  hairThicknessItems,
  naturalHairColorItems,
  countryItems,
} from "@/assets/data/items";
import { scale, scalePercent } from "@/src/utils/responsive";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from "libphonenumber-js";
import {
  responsiveScale,
  responsiveFontSize,
  isTablet,
} from "@/src/utils/responsive";
import { usePostHog } from "posthog-react-native";

const ClientSetup = () => {
  const { profilePicture, setProfilePicture } = useSetup();

  const { setLoadingSetup } = useAuth();
  const user_type = "CLIENT";
  const [alertVisible, setAlertVisible] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errors, setErrors] = useState({
    fullName: false,
    profilePicture: false,
    phone_number: false,
    country: false,
    hair_structure: false,
    hair_thickness: false,
    natural_hair_color: false,
    grey_hair_percentage: false,
  });
  const [errorMessages, setErrorMessages] = useState({
    fullName: "",
    phone_number: "",
    country: "",
  });

  const posthog = usePostHog();

  const [fields, setFields] = useState({
    fullName: "",
    phone_number: "",
    country: "",
    aboutMe: "",
    hair_structure: "",
    hair_thickness: "",
    natural_hair_color: "",
    grey_hair_percentage: "",
  });

  const getCountryCode = (countryCode: string) => {
    try {
      return `+${getCountryCallingCode(countryCode)}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert("Error fetching user.", error.message);
      } else {
        setUserId(data?.user?.id || null);
      }
    };

    fetchUserId();
    setProfilePicture(null);
  }, []);

  const validatePhoneNumber = (phone: string, countryCode: string) => {
    if (!countryCode) return false;

    try {
      const cleanPhone = phone.replace(/^\+\d+\s?/, "").trim();

      const parsed = parsePhoneNumberFromString(cleanPhone, countryCode);
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "fullName": {
        const trimmed = value.trim();

        // Empty field
        if (!trimmed) {
          setErrorMessages((prev) => ({
            ...prev,
            fullName: "Please enter your full name.",
          }));
          return false;
        }

        // More inclusive regex (allows accents, dots, apostrophes, hyphens, etc.)
        const nameRegex = /^[a-zA-ZÀ-ÿæøåÆØÅ.\s'’-]{2,50}$/;
        if (!nameRegex.test(trimmed)) {
          setErrorMessages((prev) => ({
            ...prev,
            fullName:
              "Remove any numbers or unusual symbols. Letters, spaces, hyphens (–), apostrophes (‘), and dots (.) are allowed.",
          }));
          return false;
        }

        // Passed validation
        setErrorMessages((prev) => ({ ...prev, fullName: "" }));
        return true;
      }

      case "phone_number": {
        const isValid = validatePhoneNumber(value.trim(), fields.country);
        setErrorMessages((prev) => ({
          ...prev,
          phone_number: isValid ? "" : "Please enter a valid phone number.",
        }));
        return isValid;
      }

      case "country": {
        const valid = value.trim().length > 0;
        setErrorMessages((prev) => ({
          ...prev,
          country: valid ? "" : "Please select your country.",
        }));
        return valid;
      }

      default:
        return true;
    }
  };

  const validateFields = () => {
    const newErrors = {
      fullName: !validateField("fullName", fields.fullName),
      phone_number: !validateField("phone_number", fields.phone_number),
      country: !validateField("country", fields.country),
      hair_structure: false,
      hair_thickness: false,
      natural_hair_color: false,
      grey_hair_percentage: false,
      profilePicture: false,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));

    if (attemptedSubmit) {
      setErrors((prev) => ({
        ...prev,
        [field]: !validateField(field, value),
      }));

      if (field === "country" && fields.phone_number) {
        setErrors((prev) => ({
          ...prev,
          phone_number: !validatePhoneNumber(fields.phone_number, value),
        }));
      }
    }
  };

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!userId) {
      throw new Error("User not found");
    }

    const cleanPhone = fields.phone_number.replace(/^\+\d+\s?/, "").trim();
    const parsed = parsePhoneNumberFromString(cleanPhone, fields.country);
    const avatar_url = await uploadImage();

    await updateProfile({
      id: userId,
      full_name: fields.fullName,
      avatar_url,
      phone_number: parsed ? parsed.format("E.164") : fields.phone_number,
      country: fields.country,
      hair_structure: fields.hair_structure,
      hair_thickness: fields.hair_thickness,
      natural_hair_color: fields.natural_hair_color,
      grey_hair_percentage: fields.grey_hair_percentage,
      user_type,
      about_me: fields.aboutMe,
      setup_status: true,
    });
  };

  const setUpDone = async () => {
    setAttemptedSubmit(true);

    if (!validateFields()) return;

    try {
      setLoading(true);
      setLoadingSetup(true);

      await updateUserProfile();
      posthog.capture("Profile Completed", { role: "CLIENT" });
      if (userId) {
        const { data: user } = await supabase.auth.getUser();

        posthog.identify(userId, {
          email: user?.user?.email ?? null,
          role: "CLIENT",
          name: fields.fullName,
          country: fields.country,
        });
      }

      console.log("Client setup complete, redirecting to loading screen");
      router.replace({
        pathname: "./LoadingScreen",
        params: { from: "/(setup)/ClientSetup" },
      });
    } catch (error) {
      console.error("Setup error:", error);
      setLoadingSetup(false);
      Alert.alert("Failed to complete setup", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async () => {
    if (!profilePicture?.startsWith("file://")) return profilePicture;
    try {
      const path = await uploadToStorage(profilePicture, "avatars");
      return path;
    } catch (error) {
      Alert.alert("Error uploading image", String(error));
      return null;
    }
  };

  const [uploadText, setUploadText] = useState("Upload Profile Picture");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
      setErrors((prev) => ({ ...prev, profilePicture: false }));
      setUploadText("Upload new profile picture");
    }
  };

  const getInputStyle = (fieldName: string) => {
    if (!attemptedSubmit) return styles.textInput;

    return [
      styles.textInput,
      errors[fieldName] ? styles.errorInput : styles.validInput,
    ];
  };

  const getDropdownStyle = (fieldName: string) => {
    if (!attemptedSubmit) return {};
    return errors[fieldName] ? styles.errorInput : styles.validInput;
  };

  const isLocalUri = profilePicture?.startsWith("file://");

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="Client Account" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.inputContainer}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            Full Name
          </ResponsiveText>
          <MyTextinput
            placeholder="Enter your full name"
            value={fields.fullName}
            handleChangeText={(value) => handleFieldChange("fullName", value)}
            title=""
            checkmark={attemptedSubmit && !errors.fullName}
            style={getInputStyle("fullName")}
          />
          {attemptedSubmit && errors.fullName && (
            <ResponsiveText size={12} style={styles.errorText}>
              {errorMessages.fullName}
            </ResponsiveText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ResponsiveText
            size={16}
            weight="SemiBold"
            style={[styles.label, { marginBottom: scale(8) }]}
          >
            Country
          </ResponsiveText>
          <Dropdown
            onSelect={(value: string) => {
              if (fields.country !== value) {
                handleFieldChange("country", value);
              }
            }}
            listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
            zIndex={3}
            zIndexInverse={0}
            item={countryItems}
            placeholder="Select your country"
            containerStyle={getDropdownStyle("country")}
          />
          {attemptedSubmit && errors.country && (
            <ResponsiveText size={12} style={styles.errorText}>
              Please select your country.
            </ResponsiveText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            Phone Number{" "}
            {fields.country && (
              <ResponsiveText size={14} style={styles.countryCodeText}>
                ({getCountryCode(fields.country)})
              </ResponsiveText>
            )}
          </ResponsiveText>
          <MyTextinput
            placeholder={
              fields.country
                ? "Enter your phone number"
                : "Select country first"
            }
            value={fields.phone_number}
            checkmark={attemptedSubmit && !errors.phone_number}
            handleChangeText={(value) =>
              handleFieldChange("phone_number", value)
            }
            title=""
            style={getInputStyle("phone_number")}
            editable={!!fields.country}
          />
          {attemptedSubmit && errors.phone_number && (
            <ResponsiveText size={12} style={styles.errorText}>
              Please enter a valid phone number for {fields.country}.
            </ResponsiveText>
          )}
        </View>

        <Pressable
          style={styles.pressableAlert}
          onPress={() => setAlertVisible(true)}
        >
          <Info size={scale(25)} style={styles.infoIcon} />
        </Pressable>

        <CustomAlert
          visible={alertVisible}
          title="Not sure what to choose?"
          message={`Please ask your hairdresser if you need help filling out this section.\n\nYou can edit in your profile later.`}
          onClose={() => setAlertVisible(false)}
        />

        <View style={styles.inputContainer}>
          <ResponsiveText
            size={14}
            weight="SemiBold"
            style={styles.SelectionTextHeader}
          >
            Hair structure
          </ResponsiveText>
          <Dropdown
            onSelect={(value: string) => {
              if (fields.hair_structure !== value) {
                handleFieldChange("hair_structure", value);
              }
            }}
            listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
            zIndex={2}
            zIndexInverse={1}
            item={hairStructureItems}
          />
          {attemptedSubmit && errors.hair_structure && (
            <ResponsiveText style={styles.errorText}>
              {" "}
              Please select a hair structure.{" "}
            </ResponsiveText>
          )}

          <ResponsiveText
            size={14}
            weight="SemiBold"
            style={styles.SelectionTextHeader}
          >
            Hair thickness
          </ResponsiveText>
          <Dropdown
            onSelect={(value: string) => {
              if (fields.hair_thickness !== value) {
                handleFieldChange("hair_thickness", value);
              }
            }}
            listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
            zIndex={2}
            zIndexInverse={1}
            item={hairThicknessItems}
          />
          {attemptedSubmit && errors.hair_thickness && (
            <ResponsiveText style={styles.errorText}>
              {" "}
              Please select a hair thickness.{" "}
            </ResponsiveText>
          )}

          <ResponsiveText
            size={14}
            weight="SemiBold"
            style={styles.SelectionTextHeader}
          >
            Natural hair color
          </ResponsiveText>
          <Dropdown
            onSelect={(value: string) => {
              if (fields.natural_hair_color !== value) {
                handleFieldChange("natural_hair_color", value);
              }
            }}
            listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
            zIndex={2}
            zIndexInverse={1}
            item={naturalHairColorItems}
          />
          {attemptedSubmit && errors.natural_hair_color && (
            <ResponsiveText style={styles.errorText}>
              {" "}
              Please select a hair color.{" "}
            </ResponsiveText>
          )}

          <ResponsiveText
            size={14}
            weight="SemiBold"
            style={styles.SelectionTextHeader}
          >
            Grey hair percentage
          </ResponsiveText>
          <Dropdown
            onSelect={(value: string) => {
              if (fields.grey_hair_percentage !== value) {
                handleFieldChange("grey_hair_percentage", value);
              }
            }}
            listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
            zIndex={2}
            zIndexInverse={1}
            item={greyHairPercentageItems}
          />
          {attemptedSubmit && errors.grey_hair_percentage && (
            <ResponsiveText style={styles.errorText}>
              {" "}
              Please select grey hair percentage.{" "}
            </ResponsiveText>
          )}
        </View>

        <Pressable style={styles.pickerContainer} onPress={pickImage}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.pickerText}>
            {uploadText}
          </ResponsiveText>
          {profilePicture ? (
            isLocalUri ? (
              <Image
                source={{ uri: profilePicture }}
                resizeMode="cover"
                style={styles.pickerCircle}
              />
            ) : (
              <RemoteImage
                highResPath={profilePicture}
                resizeMode="cover"
                style={styles.pickerCircle}
              />
            )
          ) : (
            <View
              style={[
                styles.pickerCircle,
                attemptedSubmit && errors.profilePicture && styles.errorInput,
              ]}
            >
              <UploadSimple size={scale(32)} color={Colors.dark.dark} />
            </View>
          )}
        </Pressable>

        <View style={styles.btnContainer}>
          <MyButton
            text={loading ? "Almost done..." : "Finish"}
            onPress={setUpDone}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientSetup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.light,
  },
  scrollContainer: {
    padding: scale(20),
  },
  label: {
    color: Colors.dark.dark,
    marginTop: scale(5),
    fontSize: responsiveFontSize(16, 12),
  },
  textInput: {
    height: responsiveScale(50, 42),
    marginRight: scale(-20),
    borderRadius: responsiveScale(20, 16),
    backgroundColor: Colors.dark.yellowish,
    marginBottom: responsiveScale(10, 6),
    marginTop: responsiveScale(7, 2),
  },
  countryCodeText: {
    color: Colors.dark.dark,
    opacity: 0.7,
  },
  infoIcon: {
    alignSelf: "center",
    color: Colors.dark.dark,
  },
  textArea: {
    backgroundColor: Colors.dark.yellowish,
    padding: responsiveScale(10, 8),
    borderRadius: responsiveScale(10, 8),
    height: responsiveScale(100, 80),
    textAlignVertical: "top",
    color: Colors.dark.dark,
    lineHeight: responsiveScale(20, 18),
    fontSize: responsiveFontSize(16, 14),
  },
  errorInput: {
    borderColor: "red",
    borderWidth: scale(1),
  },
  validInput: {
    borderColor: "green",
    borderWidth: scale(1),
  },
  pickerContainer: {
    alignItems: "center",
  },
  pickerText: {
    color: Colors.dark.dark,
    textAlign: "center",
    marginTop: scale(17),
  },
  pickerCircle: {
    marginTop: responsiveScale(17, 10),
    width: responsiveScale(130, 100),
    height: responsiveScale(130, 100),
    borderRadius: responsiveScale(75, 55),
    backgroundColor: Colors.light.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: scale(2),
    justifyContent: "center",
    alignItems: "center",
  },

  btnContainer: {
    width: scalePercent(isTablet() ? 30 : 45),
    alignSelf: "center",
    marginVertical: responsiveScale(20, 16),
    marginTop: responsiveScale(34, 24),
  },
  errorText: {
    color: "red",
    marginTop: scale(10),
  },
  inputContainer: {
    marginBottom: responsiveScale(7, 50),
  },
  checkIcon: {
    position: "absolute",
    right: scale(15),
    top: scale(12),
    transform: [{ translateY: -12 }],
  },
  SelectionTextHeader: {
    marginVertical: responsiveScale(10, 6),
    color: Colors.dark.dark,
    fontSize: responsiveFontSize(14, 12),
  },
  pressableAlert: {
    width: scale(25),
    height: scale(25),
    alignSelf: "center",
  },
});
