import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Globe, Check } from "phosphor-react-native";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import { ModerationSheetHeading } from "@/src/components/moderation/ModerationSheetParts";
import { useI18n } from "@/src/providers/LanguageProvider";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";
import { responsivePadding, responsiveScale } from "@/src/utils/responsive";
import type { AppLocale } from "@/src/i18n";

const OPTIONS: { code: AppLocale; labelKey: string }[] = [
  { code: "en", labelKey: "language.english" },
  { code: "nb", labelKey: "language.norwegian" },
  { code: "da", labelKey: "language.danish" },
  { code: "sv", labelKey: "language.swedish" },
];

export function AppLanguageButton() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("language.openPicker")}
        >
          <Globe size={responsiveScale(26)} color={primaryBlack} weight="regular" />
        </Pressable>
      </View>

      <SmallDraggableModal
        isVisible={open}
        onClose={() => setOpen(false)}
        modalHeight="52%"
        sheetVariant="brand"
        renderContent={
          <View>
            <ModerationSheetHeading title={t("language.pickerTitle")} />
            {OPTIONS.map((opt) => {
              const selected = locale === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => {
                    setLocale(opt.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.optionRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[Typography.bodyMedium, styles.optionLabel]}>
                    {t(opt.labelKey)}
                  </Text>
                  {selected ? (
                    <Check size={20} color={primaryBlack} weight="bold" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: responsivePadding(16),
  },
  hit: {
    width: responsiveScale(44),
    height: responsiveScale(44),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: responsiveScale(22),
  },
  hitPressed: {
    opacity: 0.65,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(33, 36, 39, 0.12)",
  },
  optionRowPressed: {
    opacity: 0.7,
  },
  optionLabel: {
    color: primaryBlack,
    flex: 1,
  },
});
