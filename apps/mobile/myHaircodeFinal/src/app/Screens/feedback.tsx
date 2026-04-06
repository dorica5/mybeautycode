// app/Screens/feedback.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { Stack } from "expo-router";
import TopNav from "@/src/components/TopNav";
import { MintProfileScreenShell } from "@/src/components/MintProfileScreenShell";

export default function FeedbackScreen() {
  return (
    <MintProfileScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <TopNav title="Feedback" />
      <View style={styles.webWrap}>
        <WebView
          source={{ uri: "https://myhaircode-as.canny.io/feedback" }}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator style={styles.loading} color="#212427" />
          )}
        />
      </View>
    </MintProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loading: {
    marginTop: 20,
  },
});
