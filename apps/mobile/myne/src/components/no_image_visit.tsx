import React from "react";
import { StyleSheet, View } from "react-native";
import { primaryBlack, primaryGreen, primaryWhite, secondaryGreen } from "@constants/Colors";
import { Info, Scissors, HairDryer, PaintBrush } from "phosphor-react-native";

interface NoImageVisitProps {
  iconType: "Scissors" | "HairDryer" | "PaintBrush";
}

const NoImageVisit: React.FC<NoImageVisitProps> = ({ iconType }) => {
  console.log("Item given is: ", iconType);

  const renderIcon = () => {
    switch (iconType) {
      case "Scissors":
        return <Scissors size={100} color={primaryWhite} />;
      case "HairDryer":
        return <HairDryer size={100} color={primaryWhite} />;
      case "PaintBrush":
        return <PaintBrush size={100} color={primaryWhite} />;
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
    backgroundColor: primaryWhite,
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 250,
    height: 150,
    borderRadius: 75,
    backgroundColor: secondaryGreen,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NoImageVisit;
