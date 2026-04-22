import { StyleSheet } from "react-native";
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
      <Stack.Screen name="Billing" />
      <Stack.Screen name="FirstName" />
      <Stack.Screen name="LastName" />
      <Stack.Screen name="Username" />
      <Stack.Screen name="PhoneNumber" />
      <Stack.Screen name="ProfilePicture" />
      <Stack.Screen name="AboutMe" />
      <Stack.Screen name="professional_profile" />
      <Stack.Screen name="salon_name" />
      <Stack.Screen name="SwitchAccount" />
    </Stack>
  );
};

export default _layout;

const styles = StyleSheet.create({});
