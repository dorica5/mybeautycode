import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { uploadAvatarToStorage } from "@/src/lib/uploadHelpers";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { router } from "expo-router";
import { UploadSimple } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import RemoteImage from "@/src/components/RemoteImage";
import MyButton from "@/src/components/MyButton";
import { Colors } from "@/src/constants/Colors";
import Dropdown from "@/src/components/Dropdown";
import { countryItems } from "@/assets/data/items";
import {
  isTablet,
  responsiveFontSize,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { Spacer } from "@/src/components/Spacer";
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from "libphonenumber-js";
import { usePostHog } from "posthog-react-native";

const HairdresserSetup = () => {
  const { profilePicture, setProfilePicture } = useSetup();

  const { setLoadingSetup } = useAuth();
  const user_type = "HAIRDRESSER";

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errors, setErrors] = useState({
    fullName: false,
    salonName: false,
    salonPhoneNumber: false,
    country: false,
    profilePicture: false,
  });

  const [fields, setFields] = useState({
    fullName: "",
    salonName: "",
    salonPhoneNumber: "",
    country: "",
    aboutMe: "",
  });
  const [errorMessages, setErrorMessages] = useState({
    fullName: "",
    phone_number: "",
    country: "",
  });

  const posthog = usePostHog();

  // Get country calling code for display
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
        console.error("Error fetching user:", error.message);
        Alert.alert("Error fetching user.");
      } else {
        setUserId(data?.user?.id || null);
      }
    };

    fetchUserId();
    setProfilePicture(null);
  }, []);

  // Validate phone numbers with country context
  const validatePhoneNumber = (phone: string, countryCode: string) => {
    if (!countryCode) return false;

    try {
      // Remove any existing country code prefix and clean the number
      const cleanPhone = phone.replace(/^\+\d+\s?/, "").trim();

      // Parse with the selected country
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
      salonName: !validateField("salonName", fields.salonName),
      salonPhoneNumber: !validateField(
        "salonPhoneNumber",
        fields.salonPhoneNumber
      ),
      country: !validateField("country", fields.country),
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

      // Re-validate phone number when country changes
      if (field === "country" && fields.salonPhoneNumber) {
        setErrors((prev) => ({
          ...prev,
          salonPhoneNumber: !validatePhoneNumber(
            fields.salonPhoneNumber,
            value
          ),
        }));
      }
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

  const { mutateAsync: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    if (!userId) throw new Error("User not found");

    // Format phone number with selected country
    const cleanPhone = fields.salonPhoneNumber.replace(/^\+\d+\s?/, "").trim();
    const parsed = parsePhoneNumberFromString(cleanPhone, fields.country);
    const avatar_url = await uploadImage();

    await updateProfile({
      id: userId,
      full_name: fields.fullName,
      avatar_url,
      salon_phone_number: parsed
        ? parsed.format("E.164")
        : fields.salonPhoneNumber,
      salon_name: fields.salonName,
      country: fields.country,
      user_type,
      about_me: fields.aboutMe,
      setup_status: true,
    });
  };

  const setUpDone = async () => {
    setAttemptedSubmit(true);

    if (!validateFields()) {
      console.log("Validation failed. Errors:", errors);
      return;
    }
    try {
      setLoading(true);
      setLoadingSetup(true);

      await updateUserProfile();
      posthog.capture("Profile Completed", { role: "HAIRDRESSER" });
      if (userId) {
        const { data: user } = await supabase.auth.getUser();

        posthog.identify(userId, {
          email: user?.user?.email ?? null,
          role: "HAIRDRESSER",
          name: fields.fullName,
          country: fields.country,
        });
      }

      router.replace({
        pathname: "./LoadingScreen",
        params: { from: "/(setup)/HairdresserSetup" },
      });
    } catch (error) {
      console.error("Error during setup:", error);
      setLoadingSetup(false);
      Alert.alert("Failed to complete setup", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async () => {
    if (!profilePicture?.startsWith("file://")) return profilePicture;
    try {
      const path = await uploadAvatarToStorage(profilePicture);
      return path;
    } catch (error) {
      console.error("Error uploading image:", error);
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

  const isLocalUri = profilePicture?.startsWith("file://");

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <ResponsiveText> Loading user data...</ResponsiveText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="Hairdresser Account" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            Salon Name
          </ResponsiveText>
          <MyTextinput
            placeholder="Enter salon name"
            value={fields.salonName}
            handleChangeText={(value) => handleFieldChange("salonName", value)}
            title=""
            checkmark={attemptedSubmit && !errors.salonName}
            style={getInputStyle("salonName")}
          />
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
            Salon Phone Number{" "}
            {fields.country && (
              <ResponsiveText size={14} style={styles.countryCodeText}>
                ({getCountryCode(fields.country)})
              </ResponsiveText>
            )}
          </ResponsiveText>
          <MyTextinput
            placeholder={
              fields.country
                ? "Enter salon phone number"
                : "Select country first"
            }
            value={fields.salonPhoneNumber}
            handleChangeText={(value) =>
              handleFieldChange("salonPhoneNumber", value)
            }
            title=""
            checkmark={attemptedSubmit && !errors.salonPhoneNumber}
            style={getInputStyle("salonPhoneNumber")}
            editable={!!fields.country}
          />
          {attemptedSubmit && errors.salonPhoneNumber && (
            <ResponsiveText size={12} style={styles.errorText}>
              Please enter a valid phone number for {fields.country}.
            </ResponsiveText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <ResponsiveText size={16} weight="SemiBold" style={styles.label}>
            About Me
          </ResponsiveText>
          <TextInput
            placeholder="Let your clients know what's awesome about you and your skills"
            value={fields.aboutMe}
            multiline
            style={styles.textArea}
            onChangeText={(value) => handleFieldChange("aboutMe", value)}
          />
        </View>
        <Spacer vertical={10} />

        <Pressable style={styles.pickerContainer} onPress={pickImage}>
          <ResponsiveText size={18} weight="SemiBold" style={styles.pickerText}>
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

export default HairdresserSetup;

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
    marginTop: responsiveScale(10, 2),
  },
  countryCodeText: {
    color: Colors.dark.dark,
    opacity: 0.7,
  },
  textArea: {
    marginTop: scalePercent(2),
    backgroundColor: Colors.dark.yellowish,
    padding: responsiveScale(15, 12),
    borderRadius: responsiveScale(22, 18),
    height: responsiveScale(105, 85),
    textAlignVertical: "top",
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(16, 14),
    lineHeight: responsiveScale(20, 18),
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
    marginTop: verticalScale(-6),
  },
  pickerCircle: {
    marginTop: scale(20),
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
  },
  errorText: {
    color: "red",
    marginTop: verticalScale(10),
  },
  inputContainer: {
    marginBottom: responsiveScale(7, 50),
  },
});
