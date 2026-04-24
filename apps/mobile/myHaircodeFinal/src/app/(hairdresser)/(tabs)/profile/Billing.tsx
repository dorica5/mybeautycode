import React, { useMemo } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  CaretLeft,
  CheckCircle,
  CreditCard,
  ArrowCounterClockwise,
  ArrowsLeftRight,
} from "phosphor-react-native";
import { router } from "expo-router";
import Logo from "../../../../../assets/images/myBeautyCode_logo.svg";
import { Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import {
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

export default function BillingScreen() {
  const logoSize = useBeautyCodeLogoSize();
  const subtitle = useMemo(
    () =>
      "Your current plan will appear here once billing is integrated.\n\nTrial: 7 days · Monthly: NOK 199 · Yearly: NOK 1,999 · Lifetime: NOK 4,999",
    []
  );

  const openLink = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert("Cannot open link");
    } catch {
      Alert.alert("Cannot open link");
    }
  };

  const ActionCard = ({
    title,
    subtitle: cardSubtitle,
    onPress,
  }: {
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionCard,
          pressed && { opacity: 0.92 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${cardSubtitle}`}
      >
        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <CheckCircle
              size={responsiveScale(22)}
              weight="regular"
              color={`${primaryBlack}55`}
            />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionSubtitle}>{cardSubtitle}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo width={logoSize.width * 0.72} height={logoSize.height * 0.72} />

            <Text style={[Typography.h3, styles.h1]} accessibilityRole="header">
              Billing
            </Text>
            <Text style={[Typography.bodyMedium, styles.subhead]}>{subtitle}</Text>
          </View>

          <View style={styles.section}>
            <ActionCard
              title="Manage / cancel subscription"
              subtitle="Update billing details or cancel your plan"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Manage/cancel subscription will be available when billing is integrated."
                )
              }
            />
            <ActionCard
              title="Change plan"
              subtitle="Switch between Monthly, Yearly or Lifetime"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Plan changes will be available when billing is integrated."
                )
              }
            />
            <ActionCard
              title="Restore purchases"
              subtitle="Use this if you already paid on this account"
              onPress={() =>
                Alert.alert(
                  "Restore purchases",
                  "Restore will be enabled when billing is integrated."
                )
              }
            />
          </View>

          <View style={styles.ctaBlock}>
            <MintBrandModalFooterRow>
              <MintBrandModalPrimaryButton
                label="See plans"
                onPress={() => router.push("/Screens/paywall")}
              />
              <MintBrandModalSecondaryButton
                label="Contact support"
                onPress={() =>
                  Alert.alert("Support", "Support link will be added later.")
                }
              />
            </MintBrandModalFooterRow>

            <View style={styles.linkRow}>
              <Pressable
                onPress={() => openLink("https://example.com/terms")}
                accessibilityRole="link"
              >
                <Text style={styles.link}>Terms</Text>
              </Pressable>
              <Text style={styles.linkSep}>·</Text>
              <Pressable
                onPress={() => openLink("https://example.com/privacy")}
                accessibilityRole="link"
              >
                <Text style={styles.link}>Privacy</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  topBar: {
    paddingHorizontal: responsivePadding(8),
    paddingTop: responsiveMargin(6),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(4),
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(10),
    alignSelf: "flex-start",
  },
  backText: {
    ...Typography.bodySmall,
    color: primaryBlack,
  },
  scroll: {
    paddingHorizontal: responsivePadding(24),
    paddingBottom: responsiveMargin(28),
  },
  header: {
    alignItems: "center",
    marginTop: responsiveMargin(6),
    marginBottom: responsiveMargin(22),
  },
  h1: {
    textAlign: "center",
    marginTop: responsiveMargin(18),
  },
  subhead: {
    textAlign: "center",
    marginTop: responsiveMargin(10),
    maxWidth: 360,
    opacity: 0.82,
  },
  section: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginBottom: responsiveMargin(22),
  },
  actionCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(18),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}18`,
    padding: responsivePadding(16),
    marginBottom: responsiveMargin(12),
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: responsiveMargin(12),
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(10),
    flex: 1,
    paddingRight: responsivePadding(6),
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.bodyLarge,
    color: primaryBlack,
  },
  actionSubtitle: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    marginTop: responsiveMargin(4),
    lineHeight: responsiveScale(20),
  },
  ctaBlock: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveMargin(10),
    marginTop: responsiveMargin(14),
  },
  linkSep: {
    color: primaryBlack,
    opacity: 0.35,
  },
  link: {
    ...Typography.bodySmall,
    color: primaryBlack,
    textDecorationLine: "underline",
    opacity: 0.78,
  },
});

