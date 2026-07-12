import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../providers/AuthProvider";
import { sendSupportRequest } from "../api/support";
import { useI18n } from "@/src/providers/LanguageProvider";
import { SUPPORT_EMAIL } from "@/src/constants/brand";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";

export default function SupportPage() {
  const { t } = useI18n();
  const { profile, userStatus } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t("common.error"), t("support.enterMessage"));
      return;
    }

    setLoading(true);
    try {
      await sendSupportRequest({
        subject: userStatus?.is_banned
          ? "Account Ban Appeal"
          : "Account Restriction Appeal",
        message: message.trim(),
        status: "open",
        priority: userStatus?.is_banned ? "high" : "medium",
      });

      Alert.alert(t("support.requestSentTitle"), t("support.requestSentMessage"), [
        {
          text: t("common.ok"),
          onPress: () => {
            setMessage("");
            if (userStatus?.is_banned) {
              router.replace("/Splash");
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error sending support request:", error);
      Alert.alert(t("common.error"), t("support.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openEmailSupport = () => {
    const subject = userStatus?.is_banned
      ? "Account Ban Appeal"
      : "Account Support Request";
    const body = `User ID: ${profile?.id}\nUser: ${profile?.full_name}\nEmail: ${profile?.email}\n\nMessage: `;

    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const restrictionEndLabel = userStatus?.restriction_end
    ? new Date(userStatus.restriction_end).toLocaleDateString()
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("support.title")}</Text>

      {userStatus?.is_banned ? (
        <View style={styles.banNotice}>
          <Text style={styles.banTitle}>{t("support.accountSuspended")}</Text>
          {userStatus.ban_reason ? (
            <Text style={styles.banText}>
              {t("support.banReason", { reason: userStatus.ban_reason })}
            </Text>
          ) : null}
          <Text style={styles.banText}>{t("support.banAppealHint")}</Text>
        </View>
      ) : null}

      {userStatus?.is_restricted ? (
        <View style={styles.restrictionNotice}>
          <Text style={styles.restrictionTitle}>
            {t("support.accountRestricted")}
          </Text>
          <Text style={styles.restrictionText}>
            {restrictionEndLabel
              ? t("support.restrictedUntil", { date: restrictionEndLabel })
              : t("support.restrictedFurtherNotice")}
          </Text>
          <Text style={styles.restrictionText}>
            {t("support.restrictedContactHint")}
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.label}>{t("support.messageLabel")}</Text>
        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={setMessage}
          placeholder={t("support.messagePlaceholder")}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t("support.sending") : t("support.sendButton")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emailButton} onPress={openEmailSupport}>
          <Text style={styles.emailButtonText}>{t("support.emailAlternative")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>{t("support.infoTitle")}</Text>
        <Text style={styles.infoText}>{t("support.infoResponseTime")}</Text>
        <Text style={styles.infoText}>{t("support.infoEmail")}</Text>
        <Text style={styles.infoText}>
          {t("support.infoUserId", {
            id: profile?.id?.substring(0, 8) ?? "—",
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: primaryGreen,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    textAlign: "center",
    marginBottom: 20,
    color: primaryBlack,
  },
  banNotice: {
    backgroundColor: "#fee",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#e53e3e",
  },
  banTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: "#c53030",
    marginBottom: 8,
  },
  banText: {
    color: "#c53030",
    lineHeight: 20,
  },
  restrictionNotice: {
    backgroundColor: primaryWhite,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ff8f00",
  },
  restrictionTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: "#ef6c00",
    marginBottom: 8,
  },
  restrictionText: {
    color: "#ef6c00",
    lineHeight: 20,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    marginBottom: 8,
    color: primaryBlack,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    minHeight: 120,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  emailButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  emailButtonText: {
    color: "#22c55e",
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  info: {
    backgroundColor: "#f0f9ff",
    padding: 15,
    borderRadius: 8,
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
});
