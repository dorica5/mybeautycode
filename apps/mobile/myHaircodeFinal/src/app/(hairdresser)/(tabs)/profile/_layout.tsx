import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="FullName" />
      <Stack.Screen name="PhoneNumber" />
      <Stack.Screen name="ProfilePicture" />
      <Stack.Screen name="AboutMe" />
      <Stack.Screen name="hairdresser_profile" />
      <Stack.Screen name="salon_name" />
    </Stack>
  );
};

export default _layout;

const styles = StyleSheet.create({});
