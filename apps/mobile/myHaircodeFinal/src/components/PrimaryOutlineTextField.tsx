import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import React, { useState } from "react";
import type { Ref } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Eye, EyeClosed } from "phosphor-react-native";

export type PrimaryOutlineTextFieldProps = Omit<
  TextInputProps,
  "value" | "onChangeText"
> & {
  /** Tom/utelatt: ingen label over feltet (bruk f.eks. `accessibilityLabel` + tittel i nav). */
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** When true, toggles secure entry and shows eye affordance. */
  password?: boolean;
  containerStyle?: ViewStyle;
  /** Focus programmatically (e.g. jump from email “next” to password). */
  inputRef?: Ref<TextInput>;
  /** Multi-line area (less rounded than single-line pill). */
  multiline?: boolean;
  minInputHeight?: number;
};

/**
 * Label (Typography.label) + pill field: primary white fill, 1px primary black border.
 */
export function PrimaryOutlineTextField({
  label = "",
  value,
  onChangeText,
  password = false,
  containerStyle,
  inputRef,
  multiline = false,
  minInputHeight,
  style,
  accessibilityLabel,
  ...inputProps
}: PrimaryOutlineTextFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  const showLabel = label.trim().length > 0;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {showLabel ? (
        <Text style={[Typography.label, styles.label]} accessibilityRole="text">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.fieldRow,
          multiline ? styles.fieldRowArea : styles.fieldRowSingle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={`${primaryBlack}99`}
          cursorColor={primaryBlack}
          selectionColor={primaryBlack}
          underlineColorAndroid="transparent"
          secureTextEntry={password && !showSecret}
          accessibilityLabel={showLabel ? label : accessibilityLabel}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          {...(Platform.OS === "android" && !multiline
            ? { includeFontPadding: false }
            : {})}
          style={[
            styles.input,
            multiline
              ? [
                  styles.inputArea,
                  minInputHeight != null
                    ? { minHeight: minInputHeight }
                    : null,
                ]
              : styles.inputSingleLine,
            password && value.length > 0 ? styles.inputWithEye : null,
            style,
          ]}
          {...inputProps}
          textAlign="left"
          ref={inputRef}
        />
        {password && value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showSecret ? "Hide password" : "Show password"
            }
            onPress={() => setShowSecret((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            {showSecret ? (
              <Eye size={responsiveScale(22)} color={primaryBlack} />
            ) : (
              <EyeClosed size={responsiveScale(22)} color={primaryBlack} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    marginBottom: responsiveMargin(18),
  },
  label: {
    color: primaryBlack,
    marginBottom: responsiveMargin(8),
    alignSelf: "flex-start",
  },
  fieldRow: {
    position: "relative",
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  fieldRowArea: {
    borderRadius: responsiveScale(20),
  },
  /** Single-line pill: fixed height so text can sit vertically centered. */
  fieldRowSingle: {
    minHeight: responsiveScale(52),
    justifyContent: "center",
  },
  input: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveScale(999),
  },
  inputSingleLine: {
    paddingVertical: responsivePadding(14),
    width: "100%",
  },
  inputArea: {
    minHeight: responsiveScale(120),
    borderRadius: responsiveScale(20),
    paddingVertical: responsivePadding(14),
  },
  inputWithEye: {
    paddingRight: responsivePadding(48),
  },
  eyeBtn: {
    position: "absolute",
    right: responsivePadding(12),
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
