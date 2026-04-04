import React from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { BrandHomeNavLink } from "@/src/components/BrandHomeNavLink";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  isTablet,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

const HomeScreen = () => {
  const { profile } = useAuth();
  const { avatarImage } = useImageContext();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.full_name ||
    "";
  const username = profile?.username?.trim() ?? "";

  const avatarSize = responsiveScale(120, 144);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.avatarOuter,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        >
          <AvatarWithSpinner
            uri={avatarImage}
            size={avatarSize}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
          />
        </View>

        <Text style={[Typography.h3, styles.name]} accessibilityRole="header">
          {displayName}
        </Text>
        {username ? (
          <Text style={[Typography.anton24, styles.username]}>{username}</Text>
        ) : null}

        <View style={styles.searchCard}>
          <Text
            style={[Typography.bodyLarge, styles.searchCardCopy]}
            accessibilityRole="text"
          >
            Search for a specific professional to get started
          </Text>
          <PaddedLabelButton
            title="Search for professional"
            horizontalPadding={32}
            verticalPadding={16}
            onPress={() =>
              router.push("/(client)/(tabs)/userList")
            }
            style={styles.searchCta}
            textStyle={styles.searchCtaLabel}
          />
        </View>

        <BrandHomeNavLink
          title="My visits"
          onPress={() => router.push("/haircodes/see_haircode_client")}
          style={styles.navLink}
        />
        <BrandHomeNavLink
          title="My inspiration"
          onPress={() => router.push({ pathname: "/inspiration" })}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: responsivePadding(24),
    paddingBottom: responsivePadding(32),
    alignItems: "center",
  },
  avatarOuter: {
    marginTop: responsiveMargin(isTablet() ? 16 : 24),
    marginBottom: responsiveMargin(16),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  name: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(6),
  },
  username: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(isTablet() ? 28 : 36),
  },
  searchCard: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    paddingHorizontal: responsivePadding(22),
    paddingVertical: responsivePadding(28),
    marginBottom: responsiveMargin(24),
    borderWidth: 1,
    borderColor: `${primaryBlack}18`,
  },
  searchCardCopy: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(20),
  },
  searchCta: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
  },
  searchCtaLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  navLink: {
    marginBottom: responsiveMargin(14),
  },
});
