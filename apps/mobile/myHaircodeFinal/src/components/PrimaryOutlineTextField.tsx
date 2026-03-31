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
  style,
  ...inputProps
}: PrimaryOutlineTextFieldProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[Typography.label, styles.label]} accessibilityRole="text">
        {label}
      </Text>
      <View style={styles.fieldRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={`${primaryBlack}99`}
          secureTextEntry={password && !showSecret}
          accessibilityLabel={label}
          style={[
            styles.input,
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
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  input: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(18),
    borderRadius: responsiveScale(999),
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
