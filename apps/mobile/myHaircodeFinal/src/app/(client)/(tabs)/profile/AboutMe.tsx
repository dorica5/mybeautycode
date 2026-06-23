import {
  Alert,
  Keyboard,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import TopNav from "@/src/components/TopNav";
import { BrandOutlineField } from "@/src/components/BrandOutlineField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { responsiveScale } from "@/src/utils/responsive";
import { Profile } from "@/src/constants/types";
import { useI18n } from "@/src/providers/LanguageProvider";

const AboutMe = () => {
  const { t } = useI18n();
  const { profile, setProfile } = useAuth();
  const original = profile.about_me ?? "";
  const id = profile.id;

  const [aboutMe, setAboutMe] = useState(original);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const save = () => {
    if (!id) {
      Alert.alert(t("profile.userNotFound"));
      return;
    }
    const trimmed = aboutMe.trim();
    setLoading(true);
    updateProfile(
      { id, about_me: trimmed || null },
      {
        onSuccess: () => {
          setProfile((prev: Profile) => ({
            ...prev,
            about_me: trimmed || null,
          }));
          setAboutMe(trimmed);
          setChanged(false);
          setLoading(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          Alert.alert(t("profile.updateFailed"), err.message);
        },
      }
    );
  };

  useEffect(() => {
    setChanged(aboutMe.trim() !== original.trim());
  }, [aboutMe, original]);

  return (
    <MintProfileScreenShell>
      <TopNav
        title={t("profile.aboutMe")}
        showSaveButton
        saveChanged={changed}
        saveAction={save}
        loading={loading}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={mintProfileScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          <BrandOutlineField
            accessibilityLabel={t("profile.aboutMe")}
            placeholder={t("profile.aboutMeClientHint")}
            value={aboutMe}
            onChangeText={setAboutMe}
            multiline
            minInputHeight={responsiveScale(160)}
            onFocus={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
            containerStyle={styles.field}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default AboutMe;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  field: {
    marginTop: responsiveScale(8),
  },
});
