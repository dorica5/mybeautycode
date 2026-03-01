import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "@constants/Colors";
import { Info, Scissors, HairDryer, PaintBrush } from "phosphor-react-native";

interface NoImageHaircodeProps {
  iconType: "Scissors" | "HairDryer" | "PaintBrush";
}

const NoImageHaircode: React.FC<NoImageHaircodeProps> = ({ iconType }) => {
  console.log("Item given is: ", iconType);

  const renderIcon = () => {
    switch (iconType) {
      case "Scissors":
        return <Scissors size={100} color={Colors.light.light} />;
      case "HairDryer":
        return <HairDryer size={100} color={Colors.light.light} />;
      case "PaintBrush":
        return <PaintBrush size={100} color={Colors.light.light} />;
    }
  };

  return (
    <View style={styles.rectangle}>
      <View style={styles.circle}>{renderIcon()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  rectangle: {
    width: "100%",
    height: 400,
    backgroundColor: Colors.light.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 250,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.dark.warmGreen,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NoImageHaircode;
