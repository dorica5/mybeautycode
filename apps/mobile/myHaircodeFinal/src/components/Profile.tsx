import { StyleSheet, View, Pressable, Text, useWindowDimensions } from "react-native";
import React from "react";
import { IconProps, CaretRight, Trash } from "phosphor-react-native";
import { Colors } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveScale,
  scale,
  scalePercent,
} from "../utils/responsive";

type ProfileProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
  Icon: React.ComponentType<IconProps>;
  /** Mint-style tiles on client profile; default uses yellowish (professional). */
  tileStyle?: "default" | "light";
  /**
   * Stack rows as one white card (hairdresser / pro profile). Omit on client profile
   * to keep separate tiles with gap.
   */
  groupPosition?: "first" | "middle" | "last" | "single";
  /** Light tile only: space below row (default 8). Use 46 before next section heading. */
  lightMarginBottom?: number;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const DIVIDER = "rgba(33, 36, 39, 0.12)";

const Profile = ({
  bottom = false,
  top = false,
  title,
  Icon,
  tileStyle = "default",
  groupPosition,
  lightMarginBottom,
  ...pressableProps
}: ProfileProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** Short-side breakpoint: catches iPad (incl. split view), large Android tablets, even if `isTablet()` misses. */
  const shortSide = Math.min(windowWidth, windowHeight);
  const useWideProfileRow =
    isTablet() || shortSide >= 560;
  /** Standalone mint tiles: phone ~342pt; tablet uses same short-side ratio as phones (~342/375). */
  const lightStandaloneWidth = useWideProfileRow
    ? contentCardMaxWidth(shortSide)
    : responsiveScale(342);

  const iconColor = Icon === Trash ? "#F00" : "#000";
  const isLight = tileStyle === "light";
  const inGroup = isLight && groupPosition !== undefined;
  const idleBg =
    isLight ? Colors.dark.primaryWhite : Colors.dark.yellowish;
  const pressedBg =
    isLight ? Colors.dark.secondaryGreen : Colors.dark.warmGreen;
  const cornerR = isLight ? responsiveScale(20) : scale(20);

  const isFirstInGroup =
    inGroup &&
    (groupPosition === "first" || groupPosition === "single");
  const isLastInGroup =
    inGroup && (groupPosition === "last" || groupPosition === "single");
  const showDividerBelow =
    inGroup &&
    groupPosition !== "last" &&
    groupPosition !== "single";

  return (
    <Pressable
      style={({ pressed }) => [
        /** Light standalone mint cards carry their own width; base `container` margins would squeeze them. */
        !(isLight && !inGroup) && styles.container,
        isLight &&
          !inGroup && [
            styles.containerLight,
            styles.containerLightStandaloneBase,
            { width: lightStandaloneWidth },
            {
              marginBottom:
                lightMarginBottom !== undefined ? lightMarginBottom : 8,
            },
          ],
        inGroup && styles.containerLightGrouped,
        !inGroup && {
          borderTopLeftRadius: top ? cornerR : 0,
          borderTopRightRadius: top ? cornerR : 0,
          borderBottomLeftRadius: bottom ? cornerR : 0,
          borderBottomRightRadius: bottom ? cornerR : 0,
          backgroundColor: pressed ? pressedBg : idleBg,
        },
        inGroup && {
          borderTopLeftRadius: isFirstInGroup ? cornerR : 0,
          borderTopRightRadius: isFirstInGroup ? cornerR : 0,
          borderBottomLeftRadius: isLastInGroup ? cornerR : 0,
          borderBottomRightRadius: isLastInGroup ? cornerR : 0,
          borderBottomWidth: showDividerBelow
            ? StyleSheet.hairlineWidth * 2
            : 0,
          borderBottomColor: DIVIDER,
          backgroundColor: pressed ? pressedBg : idleBg,
        },
      ]}
      {...pressableProps}
    >
      <View style={styles.subContainer}>
        {Icon && <Icon size={24} color={iconColor} />}
        <Text
          style={[
            isLight ? Typography.outfitRegular16 : Typography.bodyLarge,
            styles.title,
          ]}
        >
          {title}
        </Text>
      </View>
      <CaretRight size={24} color={iconColor} />
    </Pressable>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: scalePercent(5),
    marginBottom: responsiveScale(6, 6),
    padding: scalePercent(5),
  },
  /** Client profile menu rows — width set in component (`lightStandaloneWidth`). */
  containerLight: {
    height: responsiveScale(72),
    alignSelf: "center",
    marginHorizontal: 0,
    padding: 0,
    paddingHorizontal: responsiveScale(16),
    alignItems: "center",
  },
  /** Row layout + vertical rhythm matching former `styles.container` minus horizontal margin/padding. */
  containerLightStandaloneBase: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  /** One row inside a grouped white card (full width of card). */
  containerLightGrouped: {
    width: "100%",
    height: responsiveScale(72),
    marginBottom: 0,
    marginHorizontal: 0,
    padding: 0,
    paddingHorizontal: responsiveScale(16),
    alignItems: "center",
  },
  subContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  title: {
    marginLeft: scalePercent(3),
  },
});
