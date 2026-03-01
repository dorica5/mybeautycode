// app/Screens/feedback.tsx
import React from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Stack } from "expo-router";
import TopNav from "@/src/components/TopNav";

export default function FeedbackScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <Stack.Screen options={{ headerShown: false }} /> 
      <TopNav title="Feedback" />
      <WebView
        source={{ uri: "https://myhaircode-as.canny.io/feedback" }}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={{ marginTop: 20 }} />}
      />
    </SafeAreaView>
  );
}
