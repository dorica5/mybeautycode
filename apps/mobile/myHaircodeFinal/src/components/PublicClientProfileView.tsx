import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavBackRow, navBackChromeStyles } from "@/src/components/NavBackRow";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  responsiveFontSize,
  scalePercent,
  isTablet,
  contentCardMaxWidth,
} from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";

function displayFirstName(
  first: string | null | undefined,
  full: string | null | undefined,
  yourFallback: string
): string {
  const t = first?.trim();
  if (t) return t;
  const f = full?.trim();
  if (!f) return yourFallback;
  const sp = f.indexOf(" ");
  return sp === -1 ? f : f.slice(0, sp);
}

async function openPhone(raw: string, cannotOpenMessage: string) {
  const p = raw.trim();
  if (!p) return;
  const url = p.startsWith("tel:") ? p : `tel:${p}`;
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else Alert.alert(cannotOpenMessage);
  } catch {
    Alert.alert(cannotOpenMessage);
  }
}

export type PublicClientProfileViewProps = {
  mode: "self" | "viewer";
  fullName: string | null;
  firstName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  aboutMe?: string | null;
  onBack: () => void;
  headerRight?: React.ReactNode;
};

export function PublicClientProfileView({
  mode,
  fullName,
  firstName,
  username,
  avatarUrl,
  phoneNumber,
  aboutMe,
  onBack,
  headerRight,
}: PublicClientProfileViewProps) {
  const { t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const showEmpty = mode === "self";
  const first = displayFirstName(firstName, fullName, t("publicProfile.yourFallback"));

  const layout = useMemo(() => {
    const tablet = isTablet();
    const shellPad = responsivePadding(16, 28);
    const shortSide = Math.min(windowWidth, windowHeight);

    let maxShellW: number;
    if (tablet) {
      maxShellW = Math.min(
        windowWidth - shellPad * 2,
        contentCardMaxWidth(shortSide)
      );
    } else {
      maxShellW = Math.min(windowWidth - responsivePadding(36), 520);
    }

    const phoneAvatar = Math.round(scalePercent(38));
    const avatarSize = tablet ? responsiveScale(152, 200) : phoneAvatar;

    return { tablet, maxShellW, avatarSize };
  }, [windowWidth, windowHeight]);

  const phone = phoneNumber?.trim() ?? "";
  const aboutTrimmed = aboutMe?.trim() ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          layout.tablet && styles.scrollContentTablet,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={navBackChromeStyles.screenBar}>
          <View style={navBackChromeStyles.row}>
            <NavBackRow onPress={onBack} hitSlop={12} layout="inlineBar" />
            {headerRight ? (
              <View style={styles.headerRightWrap}>{headerRight}</View>
            ) : (
              <View style={styles.headerRightPlaceholder} />
            )}
          </View>
        </View>

        <View
          style={[
            styles.columnShell,
            {
              maxWidth: layout.maxShellW,
              paddingHorizontal: responsivePadding(16, 28),
            },
          ]}
        >
          <View style={styles.hero}>
            <AvatarWithSpinner
              uri={avatarUrl}
              size={layout.avatarSize}
              style={styles.avatar}
            />
            {fullName?.trim() ? (
              <Text style={[Typography.h3, styles.name]}>{fullName.trim()}</Text>
            ) : null}
            {username?.trim() ? (
              <Text style={[Typography.anton24, styles.username]}>
                {username.trim().replace(/^@/, "")}
              </Text>
            ) : null}
          </View>

          <View style={styles.sections}>
            {phone || showEmpty ? (
              <View style={styles.sectionBlock}>
                <Text style={[Typography.label, styles.sectionTitle]}>
                  Phone number
                </Text>
                {phone ? (
                  <Pressable
                    onPress={() => void openPhone(phone, t("common.cannotOpenPhone"))}
                    style={styles.pill}
                    accessibilityRole="button"
                  >
                    <Text style={[Typography.outfitRegular16, styles.pillText]}>
                      {phone}
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      styles.valueBox,
                      styles.valueBoxPlaceholderShell,
                    ]}
                  >
                    <Text
                      style={[Typography.outfitRegular16, styles.valuePlaceholder]}
                    >
                      Add your phone number in Profile
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {aboutTrimmed ? (
              <View style={styles.sectionBlock}>
                <Text style={[Typography.label, styles.sectionTitle]}>
                  About {first}
                </Text>
                <View style={styles.valueBox}>
                  <Text style={[Typography.outfitRegular16, styles.valueText]}>
                    {aboutTrimmed}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: responsivePadding(48),
    width: "100%",
  },
  scrollContentTablet: {
    alignItems: "center",
  },
  columnShell: {
    alignSelf: "center",
    width: "100%",
  },
  headerRightWrap: {
    minWidth: responsiveScale(40),
    alignItems: "flex-end",
  },
  headerRightPlaceholder: {
    minWidth: responsiveScale(40),
  },
  hero: {
    alignItems: "center",
    marginTop: responsiveMargin(4),
    paddingTop: responsivePadding(4),
    paddingBottom: responsivePadding(6),
  },
  avatar: {
    backgroundColor: primaryWhite,
    marginBottom: responsiveMargin(16),
  },
  name: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(4),
    lineHeight: Math.round(responsiveFontSize(36) * 1.38),
    paddingTop: responsivePadding(4),
  },
  username: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(20),
    lineHeight: Math.round(responsiveFontSize(24) * 1.38),
    paddingTop: responsivePadding(3),
  },
  sections: {
    marginTop: responsiveMargin(24),
    width: "100%",
  },
  sectionBlock: {
    marginBottom: responsiveMargin(36),
    width: "100%",
  },
  sectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  pill: {
    alignSelf: "flex-start",
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  pillText: {
    color: primaryBlack,
  },
  valueBox: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(20),
    borderWidth: 1,
    borderColor: primaryBlack,
    padding: responsivePadding(16),
  },
  valueBoxPlaceholderShell: {
    minHeight: responsiveScale(88),
  },
  valueText: {
    color: primaryBlack,
  },
  valuePlaceholder: {
    color: "rgba(33, 36, 39, 0.55)",
  },
});
