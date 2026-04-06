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
  label: string;
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
  /**
   * Single-line outline shape. Default `pill` (current app-wide default).
   * `rounded` matches setup cards (~18) — use on visit forms etc.
   */
  singleLineShape?: "pill" | "rounded";
};

/**
 * Label (Typography.label) + pill field: primary white fill, 1px primary black border.
 */
export function PrimaryOutlineTextField({
  label,
  value,
  onChangeText,
  password = false,
  containerStyle,
  inputRef,
  multiline = false,
  minInputHeight,
  singleLineShape = "pill",
  style,
  ...inputProps
}: PrimaryOutlineTextFieldProps) {
  const [showSecret, setShowSecret] = useState(false);

  const singleLineRadius =
    singleLineShape === "rounded" ? responsiveScale(18) : responsiveScale(999);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[Typography.label, styles.label]} accessibilityRole="text">
        {label}
      </Text>
      <View
        style={[
          styles.fieldRow,
          multiline
            ? styles.fieldRowArea
            : { borderRadius: singleLineRadius },
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
          accessibilityLabel={label}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            multiline
              ? [
                  styles.inputArea,
                  minInputHeight != null
                    ? { minHeight: minInputHeight }
                    : null,
                ]
              : { borderRadius: singleLineRadius },
            password && value.length > 0 ? styles.inputWithEye : null,
            style,
          ]}
          {...inputProps}
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
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    overflow: "hidden",
  },
  fieldRowArea: {
    borderRadius: responsiveScale(18),
  },
  input: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(18),
  },
  inputArea: {
    minHeight: responsiveScale(120),
    borderRadius: responsiveScale(18),
    paddingTop: responsivePadding(14),
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
