import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeft, CaretRight, Check } from "phosphor-react-native";
import {
  primaryGreen,
  primaryBlack,
  primaryWhite,
  Colors,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { Href, router, useFocusEffect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { useImageContext } from "@/src/providers/ImageProvider";
import { responsiveScale, scalePercent } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { DefaultAvatarMark } from "@/src/components/DefaultAvatarMark";
import {
  getLastAppSurface,
  getLastProfessionCode,
  setLastAppSurface,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";
import {
  PROFESSION_HEADLINE_ROLE,
  coerceProfessionCode,
  pickActiveProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { ProfileMenuSwitchAccountAddIcon } from "@/src/components/profileMenuIcons";

function professionTitle(code: ProfessionChoiceCode | null): string {
  if (code && code in PROFESSION_HEADLINE_ROLE) {
    return PROFESSION_HEADLINE_ROLE[code];
  }
  return "Professional";
}

function formatBusinessLine(
  businessName?: string | null,
  businessAddress?: string | null
): string | null {
  const name = (businessName ?? "").trim();
  const addr = (businessAddress ?? "").trim();
  if (!name && !addr) return null;
  if (name && addr) return `${name}, ${addr}`;
  return name || addr;
}

function normalizeProfessionCodes(
  codes: string[] | null | undefined
): ProfessionChoiceCode[] {
  const out: ProfessionChoiceCode[] = [];
  for (const c of codes ?? []) {
    const n = coerceProfessionCode(c);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export default function SwitchAccountScreen() {
  const { profile, loading } = useAuth();
  const { avatarImage } = useImageContext();
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [lastSurface, setLastSurfaceState] = useState<
    "client" | "professional" | null
  >(null);
  const [lastProfessionCode, setLastProfessionState] = useState<string | null>(
    null
  );

  const refreshPrefs = useCallback(async () => {
    if (!profile?.id) return;
    setPrefsLoading(true);
    try {
      const [surf, code] = await Promise.all([
        getLastAppSurface(profile.id),
        getLastProfessionCode(profile.id),
      ]);
      setLastSurfaceState(surf ?? "professional");
      setLastProfessionState(code);
    } finally {
      setPrefsLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshPrefs();
    }, [refreshPrefs])
  );

  if (loading || !profile) {
    return <ActivityIndicator style={styles.loader} />;
  }

  const profileAvatarSize = scalePercent(25);
  const normalized = normalizeProfessionCodes(profile.profession_codes);
  const professionRows: (ProfessionChoiceCode | null)[] =
    normalized.length > 0 ? normalized : [null];

  const activeProfession = pickActiveProfessionCode(
    profile.profession_codes,
    lastProfessionCode
  );

  const businessLabel = formatBusinessLine(
    profile.business_name ?? profile.salon_name,
    profile.business_address
  );

  const displayNamePro = (profile.display_name ?? "").trim() || "—";
  const clientFirst =
    (profile.first_name ?? "").trim() ||
    (profile.full_name?.split(/\s+/)[0] ?? "").trim() ||
    "—";

  const surface =
    lastSurface ??
    (profile.user_type === "HAIRDRESSER" ? "professional" : "client");

  const isProSelected = (code: ProfessionChoiceCode | null) => {
    if (surface !== "professional") return false;
    return (
      (code === null && activeProfession === null) ||
      (code !== null && activeProfession === code)
    );
  };

  const selectProfessional = async (code: ProfessionChoiceCode | null) => {
    if (code != null) {
      await setLastProfessionCode(profile.id, code);
    }
    await setLastAppSurface(profile.id, "professional");
    router.replace("/(hairdresser)/(tabs)/home");
  };

  const selectClient = async () => {
    await setLastAppSurface(profile.id, "client");
    router.replace("/(client)/(tabs)/home");
  };

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.outer}>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.paddedTop}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={styles.backRow}
                hitSlop={12}
              >
                <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
                <Text style={[Typography.bodyMedium, styles.backText]}>
                  Back
                </Text>
              </Pressable>
            </View>

            <View style={styles.mainView}>
              {avatarImage ? (
                <AvatarWithSpinner
                  uri={avatarImage}
                  size={profileAvatarSize}
                  style={styles.profilePic}
                />
              ) : (
                <View
                  style={[styles.profilePic, styles.profilePicPlaceholder]}
                >
                  <DefaultAvatarMark size={profileAvatarSize} />
                </View>
              )}

              <Pressable
                onPress={() =>
                  router.push("/(hairdresser)/(tabs)/profile/ProfilePicture")
                }
                style={styles.editImagePressable}
              >
                <Text style={styles.editImageText}>Edit image</Text>
              </Pressable>

              <Text style={styles.myProfileTitle}>My profile</Text>

              <View style={styles.switchAccountPill}>
                <Text style={styles.switchAccountText}>Switch account</Text>
              </View>

              {prefsLoading ? (
                <ActivityIndicator
                  style={styles.listLoader}
                  color={primaryBlack}
                />
              ) : (
                <>
                  {professionRows.map((code, index) => {
                    const selected = isProSelected(code);
                    return (
                      <Pressable
                        key={
                          code === null
                            ? `pro-null-${index}`
                            : `pro-${code}-${index}`
                        }
                        style={({ pressed }) => [
                          styles.accountTile,
                          pressed && styles.accountTilePressed,
                        ]}
                        onPress={() => void selectProfessional(code)}
                      >
                        <View style={styles.accountTileBody}>
                          <Text style={styles.roleTitle}>
                            {professionTitle(code)}
                          </Text>
                          <Text style={styles.accountSubtitle}>
                            {displayNamePro}
                          </Text>
                          {businessLabel ? (
                            <Text style={styles.accountSubtitle}>
                              {businessLabel}
                            </Text>
                          ) : null}
                        </View>
                        {selected ? (
                          <View style={styles.checkMark}>
                            <Check
                              size={responsiveScale(20)}
                              color={primaryWhite}
                              weight="bold"
                            />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}

                  <Pressable
                    style={({ pressed }) => [
                      styles.accountTile,
                      pressed && styles.accountTilePressed,
                    ]}
                    onPress={() => void selectClient()}
                  >
                    <View style={styles.accountTileBody}>
                      <Text style={styles.roleTitle}>Client</Text>
                      <Text style={styles.accountSubtitle}>{clientFirst}</Text>
                    </View>
                    {surface === "client" ? (
                      <View style={styles.checkMark}>
                        <Check
                          size={responsiveScale(20)}
                          color={primaryWhite}
                          weight="bold"
                        />
                      </View>
                    ) : null}
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.addAccountTile,
                      pressed && styles.accountTilePressed,
                    ]}
                    onPress={() =>
                      router.push("/(setup)/AddProfession" as Href)
                    }
                  >
                    <ProfileMenuSwitchAccountAddIcon size={24} />
                    <Text style={[Typography.bodyLarge, styles.addAccountLabel]}>
                      Add account
                    </Text>
                    <CaretRight size={24} color={primaryBlack} />
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const TILE_BORDER = primaryBlack;
/** Light green tile on primary green (design: outlined mint tile). */
const secondaryGreenTint = Colors.dark.secondaryGreen;

const styles = StyleSheet.create({
  loader: { marginTop: scalePercent(20) },
  listLoader: { marginTop: scalePercent(8) },
  outer: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
  },
  paddedTop: {
    paddingHorizontal: scalePercent(4),
    marginBottom: scalePercent(2),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(4),
    alignSelf: "flex-start",
  },
  backText: {
    color: primaryBlack,
  },
  mainView: {
    paddingBottom: scalePercent(12),
  },
  profilePic: {
    backgroundColor: Colors.dark.yellowish,
    width: scalePercent(25),
    aspectRatio: 1,
    borderRadius: scalePercent(25) / 2,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: scalePercent(2),
  },
  profilePicPlaceholder: {
    backgroundColor: primaryWhite,
    overflow: "hidden",
  },
  editImagePressable: {
    alignSelf: "center",
    marginTop: scalePercent(2),
    marginBottom: responsiveScale(10, 8),
  },
  editImageText: {
    ...Typography.bodySmall,
    textDecorationLine: "underline",
    color: primaryBlack,
  },
  myProfileTitle: {
    ...Typography.h3,
    textAlign: "center",
    marginTop: responsiveScale(12, 10),
    color: primaryBlack,
  },
  switchAccountPill: {
    alignSelf: "center",
    marginTop: scalePercent(4),
    paddingVertical: responsiveScale(12),
    paddingHorizontal: responsiveScale(20),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  switchAccountText: {
    ...Typography.bodyLarge,
    color: primaryBlack,
    textAlign: "center",
  },
  accountTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: scalePercent(5),
    marginTop: responsiveScale(10),
    paddingVertical: responsiveScale(16),
    paddingHorizontal: scalePercent(4),
    borderRadius: responsiveScale(16),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: TILE_BORDER,
    backgroundColor: secondaryGreenTint,
  },
  accountTilePressed: {
    opacity: 0.92,
  },
  accountTileBody: {
    flex: 1,
    paddingRight: scalePercent(3),
  },
  roleTitle: {
    ...Typography.agBodyMedium18,
    color: primaryBlack,
  },
  accountSubtitle: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    marginTop: responsiveScale(4),
  },
  checkMark: {
    width: responsiveScale(28),
    height: responsiveScale(28),
    borderRadius: responsiveScale(14),
    backgroundColor: primaryBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  addAccountTile: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: scalePercent(5),
    marginTop: responsiveScale(10),
    paddingVertical: responsiveScale(16),
    paddingHorizontal: scalePercent(4),
    borderRadius: responsiveScale(16),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: TILE_BORDER,
    backgroundColor: secondaryGreenTint,
  },
  addAccountLabel: {
    flex: 1,
    marginLeft: scalePercent(3),
    color: primaryBlack,
  },
});
