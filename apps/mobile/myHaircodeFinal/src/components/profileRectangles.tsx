import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "@constants/Colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { Phone } from "phosphor-react-native";
import { 
  responsiveScale, 
  scalePercent, 
  responsivePadding,
  responsiveMargin,
  responsiveBorderRadius,
} from "../utils/responsive";
import { ResponsiveText } from "./ResponsiveText";
import { LinearGradient } from "expo-linear-gradient";

interface ProfileRectangleProps {
  phone_number?: string | string[]; // Optional prop
  full_name: string;
}

const ProfileRectangle = ({ phone_number, full_name }: ProfileRectangleProps) => {
  const { profile } = useAuth();
  const [userType, setUserType] = useState(null);

  const normalizedPhoneNumber = Array.isArray(phone_number)
    ? phone_number[0]
    : phone_number;

  useEffect(() => {
    if (profile) {
      setUserType(profile.user_type);
    }
  }, [profile]);

  return (
    <View style={styles.container}>
        <LinearGradient
        colors={[
          Colors.dark.warmGreen,
          Colors.dark.warmGreen,
          
          Colors.dark.yellowish,
        ]}
        style={styles.rectangleLarge}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.rectangleSmallShadow}>
      <View style={styles.rectangleSmall}>
        <ResponsiveText
          size={normalizedPhoneNumber ? 24 : 30}
          tabletSize={normalizedPhoneNumber ? 20 : 24}
          weight="SemiBold"
          style={styles.name}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {full_name}
        </ResponsiveText>

        {normalizedPhoneNumber && (
          <View style={styles.phoneContainer}>
            <Phone
              size={responsiveScale(20)}
              color={Colors.dark.dark}
              style={styles.phoneIcon}
            />
            <ResponsiveText
              size={16}
              tabletSize={14}
              style={styles.phoneNumber}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {normalizedPhoneNumber}
            </ResponsiveText>
          </View>
        )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsiveMargin(15),
  },
  rectangleLarge: {
    position: "absolute",
    top: 0,
    width: scalePercent(100),
    height: responsiveScale(221, 350),
   
    borderBottomLeftRadius: responsiveBorderRadius(30),
    borderBottomRightRadius: responsiveBorderRadius(30),
  },
   rectangleSmallShadow: {
    position: "absolute",
    width: scalePercent(80),
    height: responsiveScale(96, 120),
    top: responsiveScale(173, 280),
    shadowOpacity: 0.5,
    shadowColor: Colors.dark.dark,
    shadowOffset: { width: 0, height: responsiveScale(4) },
    shadowRadius: responsiveScale(10),
    transform: [{ translateY: -0.15 }],
  },
  rectangleSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.yellowish,
    borderRadius: responsiveBorderRadius(30),
    borderWidth: responsiveScale(2),
    borderColor: Colors.dark.warmGreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsivePadding(10),
  },
  name: {
    textAlign: "center",
    paddingVertical: responsivePadding(4),
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: responsiveScale(2),
  },
  phoneIcon: {
    marginRight: responsiveScale(5),
  },
  phoneNumber: {
    textAlign: "center",
    color: Colors.dark.dark,
  },
});

export default ProfileRectangle;