import { View, Text } from "react-native";
import React, { useMemo } from "react";
import { Stack } from "expo-router";

const _layout = () => {
  const screenOptions = useMemo(() => ({ headerShown: false }), []);
  
  return (
    <Stack>
      <Stack.Screen name="index" options={screenOptions} />
      <Stack.Screen name="[query]" options={screenOptions} />
      <Stack.Screen name="filter-before-map" options={screenOptions} />
      <Stack.Screen name="map" options={screenOptions} />
      <Stack.Screen
        name="professionalProfile/[id]"
        options={screenOptions}
      />
    </Stack>
  );
};

export default _layout;