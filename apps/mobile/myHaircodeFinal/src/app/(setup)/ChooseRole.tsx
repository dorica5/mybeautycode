import { StyleSheet, Pressable, ScrollView } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopNav from "@/src/components/TopNav";
import MyButton from "@/src/components/MyButton";
import { Colors } from "@/src/constants/Colors";
import { router } from "expo-router";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { Spacer } from "@/src/components/Spacer";
import {
  scale,
  scalePercent,
  responsiveScale,
  isTablet,
} from "@/src/utils/responsive";

const ChooseRole = () => {
  const [selectedRole, setSelectedRole] = useState<
    "hairdresser" | "client" | null
  >(null);

  const handleRoleSelection = (role: "hairdresser" | "client") => {
    if (selectedRole === role) {
      setSelectedRole(null);
    } else {
      setSelectedRole(role);
    }
  };

  const goToNext = () => {
    if (selectedRole === "hairdresser") {
      router.push("./HairdresserSetup");
    } else if (selectedRole === "client") {
      router.push("./ClientSetup");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopNav title="Choose Role" />
      {/* Spacer is taller on phone, tighter on tablet */}
      <Spacer vertical={isTablet() ? 60 : 120} />
      <ScrollView contentContainerStyle={styles.mainContainer}>
        <Pressable
          onPress={() => handleRoleSelection("hairdresser")}
          style={[
            styles.roleBtn,
            selectedRole === "hairdresser" && styles.selectedRoleBtn,
          ]}
        >
          <ResponsiveText
            size={18}
            tabletSize={14}
            weight="SemiBold"
            style={[
              styles.roleText,
              selectedRole === "hairdresser" && styles.selectedRoleText,
            ]}
          >
            I'm a hairdresser
          </ResponsiveText>
        </Pressable>

        <Pressable
          onPress={() => handleRoleSelection("client")}
          style={[
            styles.roleBtn,
            selectedRole === "client" && styles.selectedRoleBtn,
          ]}
        >
          <ResponsiveText
            size={18}
            tabletSize={14}
            weight="SemiBold"
            style={[
              styles.roleText,
              selectedRole === "client" && styles.selectedRoleText,
            ]}
          >
            I'm a client
          </ResponsiveText>
        </Pressable>

        <MyButton
          text="Next"
          textSize={18}
          textTabletSize={14}
          onPress={goToNext}
          style={styles.nextBtn}
          disabled={!selectedRole}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.light,
  },
  mainContainer: {
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: scale(20),
  },
  roleBtn: {
    backgroundColor: Colors.dark.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: scale(2),
    borderRadius: responsiveScale(20, 28),
    padding: responsiveScale(20, 28),
    width: scalePercent(80),
    alignItems: "center",
    marginBottom: responsiveScale(75, 100),

    // Shadow for iOS and Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.4,
    shadowRadius: scale(3.84),
    elevation: 5,
  },
  selectedRoleBtn: {
    backgroundColor: Colors.dark.warmGreen,
    borderColor: Colors.dark.yellowish,
  },
  roleText: {
    color: Colors.dark.dark,
    textAlign: "center",
  },
  selectedRoleText: {
    color: Colors.dark.dark,
  },
  nextBtn: {
    width: scalePercent(25),
    alignSelf: "center",
  },
});

export default ChooseRole;
