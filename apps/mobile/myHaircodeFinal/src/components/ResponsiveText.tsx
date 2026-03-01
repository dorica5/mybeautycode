import React from "react";
import {Text, TextProps, StyleSheet} from "react-native";
import { responsiveFontSize } from "../utils/responsive";

type ResponsiveTextProps = TextProps & {
    size? : number;
    tabletSize?: number;
    weight? : "Regular" | "SemiBold" | "Bold";
};

export const ResponsiveText  =({
    size = 16,
    tabletSize,
    weight = "Regular",
    style, 
    children, 
    ...rest
}: ResponsiveTextProps) => {
    return (
      <Text
        {...rest}
        style={[
          {
            fontFamily: `Inter-${weight}`,
            fontSize: responsiveFontSize(size, tabletSize),
            includeFontPadding: false,   // 🔑 fjern ekstra padding
            textAlignVertical: "top",    // 🔑 linjer starter på samme baseline
          },
          style,
        ]}
      >
        {children}
      </Text>
    )
}