/* eslint-disable react/react-in-jsx-scope */
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { UserCircle } from "phosphor-react-native";
import { useAuth } from "@/src/providers/AuthProvider";
import RemoteImage from "@/src/components/RemoteImage";
import { useImageContext } from "@/src/providers/ImageProvider";
import { Colors } from "@/src/constants/Colors";
import ProfileRectangle from "@/src/components/profileRectangles";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import {
  responsiveScale,
  scalePercent,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const HairdresserProfile = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.container}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconContainer}
            >
              <CaretLeft size={responsiveScale(32)} color={Colors.dark.dark} />
            </Pressable>

            <ProfileRectangle
              full_name={profile.full_name}
              phone_number={profile.phone_number}
            />
            <View>
              {profile ? (
                avatarImage ? (
                  <AvatarWithSpinner
                    uri={avatarImage}
                    size={scalePercent(25)}
                    style={styles.profilePic}
                  />
                ) : (
                  <View style={styles.profilePicPlaceholder}>
                    <UserCircle
                      size={responsiveScale(90)}
                      color={Colors.dark.dark}
                    />
                  </View>
                )
              ) : (
                <UserCircle
                  size={responsiveScale(90)}
                  color={Colors.dark.dark}
                />
              )}
            </View>

            <View style={styles.stack}>
              <View style={styles.aboutHairRow}>
                <Text style={styles.TextHeader}>Hair structure</Text>
                <View style={styles.dropDownContainers}>
                  <Text
                    style={[
                      styles.aboutHairText,
                      { fontSize: responsiveFontSize(16, 14) },
                    ]}
                  >
                    {profile?.hair_structure || ""}
                  </Text>
                </View>
              </View>

              <View style={styles.aboutHairRow}>
                <Text style={styles.TextHeader}>Hair thickness</Text>
                <View style={styles.dropDownContainers}>
                  <Text
                    style={[
                      styles.aboutHairText,
                      { fontSize: responsiveFontSize(16, 14) },
                    ]}
                  >
                    {profile?.hair_thickness || ""}
                  </Text>
                </View>
              </View>

              <View style={styles.aboutHairRow}>
                <Text style={styles.TextHeader}>Natural hair color</Text>
                <View style={styles.dropDownContainers}>
                  <Text
                    style={[
                      styles.aboutHairText,
                      { fontSize: responsiveFontSize(16, 14) },
                    ]}
                  >
                    {profile?.natural_hair_color || ""}
                  </Text>
                </View>
              </View>

              <View style={styles.aboutHairRow}>
                <Text style={styles.TextHeader}>Grey hair percentage</Text>
                <View style={styles.dropDownContainers}>
                  <Text
                    style={[
                      styles.aboutHairText,
                      { fontSize: responsiveFontSize(16, 14) },
                    ]}
                  >
                    {profile?.grey_hair_percentage || ""}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default HairdresserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: responsiveScale(100),
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    alignSelf: "center",
    marginTop: responsiveScale(40),
  },
  profilePicPlaceholder: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    height: scalePercent(25),
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: responsiveScale(40),
  },
  stack: {
    marginTop: responsiveScale(250, 400), 
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
  },
  TextHeader: {
    fontSize: responsiveFontSize(20, 16),
    marginTop: responsiveScale(35),
    fontFamily: "Inter-SemiBold",
    marginBottom: responsiveScale(10),
    textAlign: "left",
    marginRight: scalePercent(10),
    width: scalePercent(40),
  },
  dropDownContainers: {
    backgroundColor: Colors.dark.light,
    borderColor: Colors.dark.yellowish,
    borderWidth: responsiveScale(3),
    borderRadius: responsiveBorderRadius(20, 10),
    height: responsiveScale(50, 50),
    width: scalePercent(35),
    marginTop: responsiveScale(20, 30),
  },
  aboutHairRow: {
    flexDirection: "row",
    marginTop: responsiveScale(8),
  },

  aboutHairText: {
    textAlign: "center",
    fontSize: responsiveFontSize(16, 12),
    fontFamily: "Inter-Regular",
    width: scalePercent(22),
    marginTop: responsiveScale(12),
  },
  scrollViewContent: {
    paddingBottom: responsiveScale(100),
    paddingTop: 0,
  },

  iconContainer: {
    position: "absolute",
    top: responsiveScale(60),
    left: responsiveScale(20),
    zIndex: 10,
  },
});
