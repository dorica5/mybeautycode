import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BrandAnchoredMultiSelect } from "@/src/components/BrandAnchoredMultiSelect";
import CustomAlert from "@/src/components/CustomAlert";
import { InfoStroke16 } from "@/src/components/icons/GetDiscoveredStrokeIcons";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";
import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
import {
  discoverySectionTitleForProfession,
  localizedDiscoveryOptionsForProfession,
  sanitizeDiscoveryCategoriesForProfession,
} from "@/src/constants/profDiscoveryCategories";
import { useI18n } from "@/src/providers/LanguageProvider";
import { responsiveMargin } from "@/src/utils/responsive";

type Props = {
  professionCode: ProfessionChoiceCode;
  value: string[];
  onChange: (next: string[]) => void;
  showError?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Get-discovered expertise chips — used during professional setup and on About me.
 */
export function ProfessionalDiscoveryCategoriesSection({
  professionCode,
  value,
  onChange,
  showError = false,
  containerStyle,
}: Props) {
  const { t } = useI18n();
  const [infoVisible, setInfoVisible] = useState(false);

  const options = useMemo(
    () => localizedDiscoveryOptionsForProfession(professionCode, t),
    [professionCode, t]
  );

  const sectionTitle = discoverySectionTitleForProfession(professionCode, t);

  const commit = useCallback(
    (next: string[]) => {
      onChange(
        sanitizeDiscoveryCategoriesForProfession(next, professionCode)
      );
    },
    [onChange, professionCode]
  );

  if (options.length === 0) return null;

  return (
    <View style={[styles.section, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[Typography.label, styles.sectionLabel]}>
          {sectionTitle}
        </Text>
        <Pressable
          onPress={() => setInfoVisible(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("discover.expertiseInfoA11y")}
        >
          <InfoStroke16 />
        </Pressable>
      </View>
      <BrandAnchoredMultiSelect
        label={sectionTitle}
        hideLabel
        items={options.map((opt) => ({
          value: opt.code,
          label: opt.label,
        }))}
        value={value}
        onChange={commit}
        placeholder={t("aboutMePro.selectCategories")}
        containerStyle={styles.dropdown}
      />
      {showError && value.length === 0 ? (
        <Text style={styles.errorText}>{t("discover.expertiseRequired")}</Text>
      ) : null}
      <CustomAlert
        visible={infoVisible}
        title={t("discover.expertiseInfoTitle")}
        message={t("discover.expertiseInfoMessage")}
        onClose={() => setInfoVisible(false)}
        compact
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: responsiveMargin(8),
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: responsiveMargin(12),
    gap: responsiveMargin(8),
  },
  sectionLabel: {
    color: primaryBlack,
    flex: 1,
    alignSelf: "flex-start",
  },
  dropdown: {
    marginBottom: 0,
  },
  errorText: {
    ...Typography.bodySmall,
    color: "#B00020",
    marginTop: responsiveMargin(8),
  },
});
