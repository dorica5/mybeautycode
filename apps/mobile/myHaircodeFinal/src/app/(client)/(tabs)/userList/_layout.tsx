import React, { useMemo } from "react";
import { Stack } from "expo-router";

const _layout = () => {
  const screenOptions = useMemo(() => ({ headerShown: false }), []);
  
  return (
    <Stack
      initialRouteName="filter-before-map"
      screenOptions={screenOptions}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[query]" />
      <Stack.Screen name="filter-before-map" />
      <Stack.Screen name="map" />
      <Stack.Screen name="professionalProfile/[id]" />
    </Stack>
  );
};

export default _layout;