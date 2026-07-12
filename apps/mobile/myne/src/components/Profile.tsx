import { StyleSheet, View, Pressable, Text, useWindowDimensions } from "react-native";
import React from "react";
import { IconProps, CaretRight, Trash } from "phosphor-react-native";
import { primaryBlack, primaryWhite, secondaryGreen } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveScale,
} from "../utils/responsive";

type ProfileProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
  Icon: React.ComponentType<IconProps>;
  /**
   * Stack rows as one white card (e.g. billing). Omit for separate tiles with gap.
   */
  groupPosition?: "first" | "middle" | "last" | "single";
  /** Space below standalone tile (default 8). Use 46 before next section heading. */
  lightMarginBottom?: number;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const Profile = ({
  bottom = false,
  top = false,
  title,
  Icon,
  groupPosition,
  lightMarginBottom,
  ...pressableProps
}: ProfileProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const shortSide = Math.min(windowWidth, windowHeight);
  const useWideProfileRow = isTablet() || shortSide >= 560;
  const lightStandaloneWidth = useWideProfileRow
    ? contentCardMaxWidth(shortSide)
    : responsiveScale(342);

  const iconColor = Icon === Trash ? "#F00" : primaryBlack;
  const inGroup = groupPosition !== undefined;
  const cornerR = responsiveScale(20);

  return (
    <Pressable
      style={({ pressed }) => [
        !inGroup && [
          styles.containerLight,
          styles.containerLightStandaloneBase,
          { width: lightStandaloneWidth },
          {
            marginBottom:
              lightMarginBottom !== undefined ? lightMarginBottom : 8,
            borderTopLeftRadius: top ? cornerR : responsiveScale(20),
            borderTopRightRadius: top ? cornerR : responsiveScale(20),
            borderBottomLeftRadius: bottom ? cornerR : responsiveScale(20),
            borderBottomRightRadius: bottom ? cornerR : responsiveScale(20),
          },
        ],
        inGroup && [styles.containerLightGrouped, styles.containerLightStandaloneBase],
        {
          backgroundColor: pressed ? secondaryGreen : primaryWhite,
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        {Icon && <Icon size={24} color={iconColor} />}
        <Text style={[Typography.outfitRegular16, styles.title]}>{title}</Text>
      </View>
      <CaretRight size={24} color={iconColor} />
    </Pressable>
  );
};

export default Profile;

const styles = StyleSheet.create({
  containerLight: {
    height: responsiveScale(72),
    alignSelf: "center",
    marginHorizontal: 0,
    padding: 0,
    paddingHorizontal: responsiveScale(16),
    alignItems: "center",
  },
  containerLightStandaloneBase: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  containerLightGrouped: {
    width: "100%",
    height: responsiveScale(72),
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    padding: 0,
    paddingHorizontal: responsiveScale(16),
    alignItems: "center",
    alignSelf: "stretch",
    flexShrink: 0,
  },
  subContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  title: {
    marginLeft: responsiveScale(12),
  },
});
