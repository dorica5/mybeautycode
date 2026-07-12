import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../providers/AuthProvider";
import { useI18n } from "@/src/providers/LanguageProvider";

export default function RestrictedPage() {
  const { t } = useI18n();
  const { userStatus, signOut } = useAuth();

  const timeRemaining = useMemo(() => {
    if (!userStatus?.restriction_end) return t("restricted.timeUnknown");

    const endDate = new Date(userStatus.restriction_end);
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();

    if (timeDiff <= 0) return t("restricted.timeShouldLift");

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return t("restricted.timeDaysHours", {
        days: String(days),
        hours: String(hours),
      });
    }
    return t("restricted.timeHours", { hours: String(hours) });
  }, [t, userStatus?.restriction_end]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⏳</Text>
      </View>

      <Text style={styles.title}>{t("restricted.title")}</Text>

      <View style={styles.messageContainer}>
        <Text style={styles.message}>{t("restricted.message")}</Text>

        <Text style={styles.timeInfo}>
          {t("restricted.timeRemaining", { time: timeRemaining })}
        </Text>

        <Text style={styles.details}>{t("restricted.details")}</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => router.push("/support")}
        >
          <Text style={styles.supportButtonText}>
            {t("restricted.contactSupport")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>{t("restricted.signOut")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>{t("restricted.whatThisMeans")}</Text>
        <Text style={styles.infoText}>{t("restricted.limitFeatures")}</Text>
        <Text style={styles.infoText}>{t("restricted.limitBookings")}</Text>
        <Text style={styles.infoText}>{t("restricted.limitMessages")}</Text>
        <Text style={styles.infoText}>{t("restricted.limitAutoLift")}</Text>
      </View>

      <Text style={styles.appealText}>{t("restricted.appealHint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#ef6c00",
  },
  messageContainer: {
    backgroundColor: "#fff8e1",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: "#ff8f00",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
    lineHeight: 22,
  },
  timeInfo: {
    fontSize: 18,
    fontFamily: "Inter-Bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#ef6c00",
  },
  details: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
  },
  actionsContainer: {
    width: "100%",
    marginBottom: 30,
  },
  supportButton: {
    backgroundColor: "#22c55e",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  signOutButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  signOutButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  infoContainer: {
    backgroundColor: "#f0f9ff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    marginBottom: 10,
    color: "#0369a1",
  },
  infoText: {
    color: "#0369a1",
    marginBottom: 5,
    lineHeight: 20,
  },
  appealText: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
});
