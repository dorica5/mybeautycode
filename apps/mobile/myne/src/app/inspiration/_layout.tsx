import { Stack } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";

export default function InspirationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...nativeStackHorizontalIOSLike,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
