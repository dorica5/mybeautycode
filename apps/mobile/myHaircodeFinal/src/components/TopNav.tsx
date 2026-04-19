import React from "react";
import { View, Pressable, StyleSheet, Text, type TextStyle } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import {
  isTablet,
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "../utils/responsive";
import { Typography } from "../constants/Typography";
import { primaryBlack } from "../constants/Colors";

/** Lik avstand til venstre (Back) og høyre (Save) — én felles inset. */
const TOP_ROW_HORIZONTAL_INSET =
  responsivePadding(4) + responsivePadding(8);

type TopNavProps = {
  title: string;
  /** Valgfri andre linje under hovedtittel (kun der det trengs, f.eks. About me-skjermen). */
  titleLine2?: string;
  /** Behold samme topplinje-layout som med Back, men uten synlig tilbake (f.eks. tab-hjem). */
  hideBack?: boolean;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  /** Overstyr typografi for andre tittellinje (f.eks. mindre undertittel på tab-hjem). */
  titleLine2Style?: TextStyle;
  /** Avstand (design-dp) fra tittel til innhold under TopNav; bruker {@link responsiveScale}. */
  titleMarginBottom?: number;
  loading?: boolean;
  /** When set, Back calls this instead of `router.back()` (e.g. cross-stack return). */
  onBackPress?: () => void;
};

const TopNav = ({
  title,
  titleLine2,
  hideBack = false,
  showSaveButton = false,
  saveChanged = false,
  loading = false,
  saveAction,
  titleStyle,
  titleLine2Style,
  titleMarginBottom,
  onBackPress,
}: TopNavProps) => {
  const titleBottomGap =
    titleMarginBottom !== undefined
      ? { marginBottom: responsiveScale(titleMarginBottom) }
      : null;
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {hideBack ? (
          <View
            style={[styles.navHalf, styles.navHalfStart, styles.navHalfSpacer]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              onBackPress ? onBackPress() : router.back()
            }
            style={[styles.navHalf, styles.navHalfStart]}
            hitSlop={12}
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
          </Pressable>
        )}

        {showSaveButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={loading ? "Saving" : "Save"}
            onPress={saveAction}
            disabled={loading}
            style={[styles.navHalf, styles.navHalfEnd, styles.savePressable]}
            hitSlop={12}
          >
            <Text
              style={[
                Typography.bodyMedium,
                styles.saveText,
                {
                  color: saveChanged ? "#ED1616" : "rgba(33, 36, 39, 0.2)",
                },
              ]}
            >
              {loading ? "Saving" : "Save"}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.navHalf, styles.navHalfSpacer]} />
        )}
      </View>

      {title ? (
        titleLine2 ? (
          <View
            style={styles.titleArea}
            accessibilityRole="header"
            accessibilityLabel={`${title.trim()} ${titleLine2}`}
          >
            <Text style={[Typography.h3, styles.titleMain, titleStyle]}>
              {title}
            </Text>
            <Text
              style={[
                Typography.h3,
                styles.titleLine2Text,
                titleStyle,
                titleLine2Style,
              ]}
            >
              {titleLine2}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              Typography.h3,
              styles.titleBelow,
              titleStyle,
              titleBottomGap,
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )
      ) : null}
    </View>
  );
};

export default TopNav;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOP_ROW_HORIZONTAL_INSET,
    paddingTop: responsivePadding(4, 2),
  },
  /** Venstre/høyre halvdel: lik bredde, samme touch-høyde som Back. */
  navHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
    minHeight: responsiveScale(44),
    minWidth: 0,
  },
  navHalfStart: {
    justifyContent: "flex-start",
  },
  navHalfEnd: {
    justifyContent: "flex-end",
  },
  /** Skyver Save litt inn fra høyre kant. */
  savePressable: {
    paddingEnd: responsiveMargin(10),
  },
  navHalfSpacer: {
    opacity: 0,
  },
  backText: {
    color: primaryBlack,
  },
  saveText: {
    color: primaryBlack,
  },
  /** Under back-rad, som «Create account» / GeneralSetup (centerHeading). */
  titleBelow: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
    marginTop: responsiveMargin(isTablet() ? 20 : 48),
    marginBottom: responsiveMargin(14),
  },
  titleArea: {
    width: "100%",
    alignItems: "center",
    marginTop: responsiveMargin(isTablet() ? 20 : 48),
    marginBottom: responsiveMargin(14),
  },
  titleMain: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
  },
  titleLine2Text: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
    marginTop: responsiveMargin(6),
  },
});
