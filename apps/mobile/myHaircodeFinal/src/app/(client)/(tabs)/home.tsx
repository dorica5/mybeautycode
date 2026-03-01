import { View, StyleSheet, StatusBar, Pressable, Text } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@constants/Colors";
import MyButton from "@/src/components/MyButton";
import { UserCircle, XCircle } from "phosphor-react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import ProfileRectangle from "@/src/components/profileRectangles";
import { useIsFocused } from "@react-navigation/native";
import {
  scale,
  scalePercent,
  responsiveScale,
  isTablet,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  responsiveBorderRadius,
  widthPercent,
  heightPercent,
} from "@/src/utils/responsive";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TAB_COUNT = 4;
const SEARCH_ICON_INDEX = 2; // 0 = home, 1 = bell, 2 = search, 3 = profile
const SEARCH_ICON_CENTER =
  (SCREEN_WIDTH / TAB_COUNT) * (SEARCH_ICON_INDEX + 0.5);

const HomeScreen = () => {
  const [showTutorial, setshowTutorial] = useState(false);
  const isFocused = useIsFocused();
  const { profile, session } = useAuth();
  const { avatarImage } = useImageContext();

  useEffect(() => {
    if (isFocused) {
      console.log("Focused");
    }
  }, [isFocused, profile, session]);

  useEffect(() => {
  const checkFirstTime = async () => {
    try {
      const hasVisited = await AsyncStorage.getItem("hasVisitedHome");
      if (!hasVisited) {
        setshowTutorial(true); 
        await AsyncStorage.setItem("hasVisitedHome", "true");
      }
    } catch (error) {
      console.error("Error checking tutorial state:", error);
    }
  };

  checkFirstTime(); 
}, []);

useEffect(() => {
  if (isFocused) {
    console.log("Focused");
  }
}, [isFocused, profile, session]);


  if (!isFocused) return null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.dark.warmGreen} />
      <ProfileRectangle full_name={profile.full_name} />

      <View>
        {profile ? (
          avatarImage ? (
            <AvatarWithSpinner
              uri={avatarImage}
              size={scalePercent(25)}
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePic}>
              <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} />
            </View>
          )
        ) : (
          <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} />
        )}
      </View>

      <MyButton
        style={styles.myHaircodesButton}
        text="My haircodes"
        onPress={() => router.push("/haircodes/see_haircode_client")}
      />

      <MyButton
        style={styles.myInspirationButton}
        text="My inspiration"
        onPress={() => {
          router.push({ pathname: "/inspiration" });
        }}
      />
      {showTutorial && (
        <View style={styles.tutorialContainer}>
          <View style={styles.bubble}>
            <View style={styles.row}>
              <Text style={styles.bubbleText}>
                Start here! Search for a specific hairdresser to get started
              </Text>
              <Pressable
                onPress={() => setshowTutorial(false)}
                style={styles.closeButton}
              >
                <XCircle size={scale(26)} color={Colors.dark.dark} />
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.triangleWrap,
               { left: SEARCH_ICON_CENTER },
            ]}
          >
            <View style={styles.triangleBorder} />
            <View style={styles.triangleFill} />
          </View>
        </View>
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },

  myHaircodesButton: {
    marginTop: isTablet() ? scalePercent(70) : scalePercent(100),
    marginHorizontal: scale(15),
    zIndex: 1,
    shadowColor: Colors.dark.dark,
    shadowOffset: {
      width: 0,
      height: responsiveScale(2),
    },
    shadowOpacity: 0.6,
    shadowRadius: scale(4),
    elevation: 10,
  },
  myInspirationButton: {
    zIndex: 1,
    borderWidth: scale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: Colors.dark.yellowish,
    marginHorizontal: scale(15),
    marginTop: scalePercent(1),
    shadowColor: Colors.dark.dark,
    shadowOffset: {
      width: 0,
      height: responsiveScale(2),
    },
    shadowOpacity: 0.6,
    shadowRadius: scale(4),
    elevation: 10,
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    position: "absolute",
    width: scalePercent(25),
    aspectRatio: 1,
    borderRadius: responsiveScale(100),
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: responsiveScale(55, 40),
    zIndex: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "80%",
  },
  tutorialContainer: {
  position: "absolute",
  bottom: scalePercent(14), 
  left: 0,
  right: 0,
  alignItems: "center",
  zIndex: 9999,
},
  bubble: {
    backgroundColor: Colors.light.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: scale(3),
    borderRadius: responsiveBorderRadius(10),
    paddingVertical: 14,
    paddingHorizontal: 18,
    maxWidth: widthPercent(90),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    position: "relative",
  },

  bubbleText: {
    flexShrink: 1,
    flexWrap: "wrap",
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(17, 12),
    color: Colors.dark.dark,
    textAlign: "center",
    lineHeight: 22,
    marginRight: responsiveMargin(8),
  },

  closeButton: {
    padding: responsivePadding(2),
    borderRadius: responsiveBorderRadius(13),
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },

  triangleWrap: {
  position: "absolute",
  top: heightPercent(13.6),        
  width: 0,
  height: 0,
  alignItems: "center",
  justifyContent: "center",
},

triangleBorder: {
  position: "relative",
  width: 0,
  height: 0,
  borderLeftWidth: scale(20),
  borderRightWidth: scale(20),
  borderTopWidth: scale(32),               
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderTopColor: Colors.dark.warmGreen,   
  justifyContent: "center",
  alignItems: "center",
},

triangleFill: {
  position: "absolute",
  top: scale(-17),                          
  width: 0,
  height: 0,
  borderLeftWidth: scale(14),
  borderRightWidth: scale(14),
  borderTopWidth: scale(22),
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderTopColor: Colors.light.yellowish,  
},



});
