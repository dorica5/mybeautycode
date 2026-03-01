import React from "react";
import { View } from "react-native";
import { scale, verticalScale } from "@/src/utils/responsive";

type SpacerProps = {
    horizontal? : number;
    vertical? : number;
};

export const Spacer = ( {horizontal = 0, vertical = 0} : SpacerProps) => {
    return <View style ={{width : scale(horizontal), height : verticalScale(vertical)}} />
}
