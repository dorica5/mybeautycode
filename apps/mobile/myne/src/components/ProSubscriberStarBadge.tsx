import React from "react";

import { View, type ViewProps } from "react-native";

import { Star } from "phosphor-react-native";

import { primaryBlack } from "@/src/constants/Colors";

import { responsiveScale } from "@/src/utils/responsive";



type ProSubscriberStarBadgeProps = {

  size?: number;

} & Pick<ViewProps, "accessibilityLabel">;



/** Filled subscriber star (no background circle). */

export function ProSubscriberStarBadge({

  size = 22,

  accessibilityLabel,

}: ProSubscriberStarBadgeProps) {

  const icon = responsiveScale(size);



  return (

    <View

      accessible={Boolean(accessibilityLabel)}

      accessibilityRole={accessibilityLabel ? "image" : undefined}

      accessibilityLabel={accessibilityLabel}

    >

      <Star size={icon} color={primaryBlack} weight="fill" />

    </View>

  );

}


