import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrandAddressAutocompleteField,
  type PlaceDetails,
} from "@/src/components/BrandAddressAutocompleteField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import TopNav from "@/src/components/TopNav";
import { useAuth } from "@/src/providers/AuthProvider";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import { Typography } from "@/src/constants/Typography";
import { scale } from "@/src/utils/responsive";
import type { ProfessionDetailApi } from "@/src/constants/types";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import { geocodeAddress, getGooglePlacesKey } from "@/src/lib/googlePlaces";

const SalonAddress = () => {
  const { profile } = useAuth();
  const { storedProfessionReady, activeProfessionCode } =
    useActiveProfessionState(profile);

  /**
   * Strictly per-lane value. Do NOT fall back to `profile.business_address`:
   * that top-level field is serialized from the default (hair-first) profession
   * row, so using it as a fallback would show the same address across every
   * lane even when the DB has different ones.
   */
  const detailForActive = useMemo(() => {
    const rows = profile?.professions_detail;
    const code = activeProfessionCode;
    if (!rows?.length || !code) return null;
    return (
      rows.find(
        (r: ProfessionDetailApi) =>
          coerceProfessionCode(r.profession_code) === code
      ) ?? null
    );
  }, [profile?.professions_detail, activeProfessionCode]);

  const originalAddress = detailForActive?.business_address ?? "";
  const id = profile?.id;
  const profileCountry = profile?.country?.trim() ?? "";

  const [address, setAddress] = useState(originalAddress);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Keep the input in sync with the active-lane value. Runs when the stored
   * profession finishes loading, when the user switches lane elsewhere, or
   * after a successful save refreshes `profile.professions_detail`. We only
   * overwrite unsaved edits when the lane itself changes.
   */
  useEffect(() => {
    if (!storedProfessionReady) return;
    if (hasEdited) return;
    setAddress(originalAddress);
    setPlaceDetails(null);
  }, [storedProfessionReady, originalAddress, hasEdited]);

  useEffect(() => {
    setHasEdited(false);
    setAttemptedSubmit(false);
    setError(false);
    setErrorMessage("");
  }, [activeProfessionCode]);

  const changed = hasEdited && address !== originalAddress;

  const validate = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMessage("Please enter your salon address.");
      return false;
    }
    setErrorMessage("");
    return true;
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setHasEdited(true);
    if (attemptedSubmit) {
      setError(!validate(value));
    }
  };

  const { mutate: updateProfile } = useUpdateSupabaseProfile();

  const updateUserProfile = async () => {
    setAttemptedSubmit(true);

    if (!validate(address)) {
      setError(true);
      return;
    }
    if (!id) {
      Alert.alert("User not found");
      return;
    }
    if (!activeProfessionCode) {
      Alert.alert(
        "Pick a profession first",
        "Open Switch account and select the profession you want to edit."
      );
      return;
    }

    setLoading(true);
    let trimmed = address.trim();

    /**
     * Resolve the address to Google place identity.
     *
     * Places Autocomplete surfaces a subset of Google's address graph (POIs
     * + establishments + a slice of street numbers). Plenty of valid
     * addresses won't appear as suggestions — especially Scandinavian
     * residential ones. If the user didn't pick a suggestion we geocode the
     * typed text, which is far more forgiving because it matches on the
     * string directly. Either path yields `placeId` + canonical
     * `formattedAddress` + lat/lng, which the backend uses to upsert the
     * canonical `Salon` row so the pin shows up on the map.
     */
    let resolvedPlaceId: string | null = null;
    let resolvedLat: number | null = null;
    let resolvedLng: number | null = null;

    const placeStillMatches =
      placeDetails && placeDetails.formattedAddress.trim() === trimmed;
    if (placeStillMatches) {
      resolvedPlaceId = placeDetails!.placeId;
      resolvedLat = placeDetails!.latitude;
      resolvedLng = placeDetails!.longitude;
    } else {
      const apiKey = getGooglePlacesKey();
      if (apiKey) {
        const geocoded = await geocodeAddress(trimmed, apiKey, {
          countryCode:
            profileCountry.length === 2 ? profileCountry : undefined,
        });
        if (geocoded) {
          // Adopt Google's canonical formatting so the saved address is clean
          // and consistent with addresses picked via autocomplete.
          trimmed = geocoded.formattedAddress.trim();
          setAddress(trimmed);
          resolvedPlaceId = geocoded.placeId || null;
          resolvedLat = geocoded.latitude;
          resolvedLng = geocoded.longitude;
        }
      }
    }

    /**
     * If we still have no coords, the address didn't match anything Google
     * recognizes. Save-as-text would silently break the map pin, so prompt
     * the user to confirm rather than fail quietly.
     */
    if (resolvedLat == null || resolvedLng == null) {
      setLoading(false);
      Alert.alert(
        "Address not recognized",
        `We couldn't verify "${trimmed}". Try adding your city or postal code so it can be mapped.`,
        [
          { text: "Edit address", style: "cancel" },
          {
            text: "Save anyway",
            style: "destructive",
            onPress: () => submitProfile(trimmed, null, null, null),
          },
        ]
      );
      return;
    }

    submitProfile(trimmed, resolvedPlaceId, resolvedLat, resolvedLng);
  };

  const submitProfile = (
    trimmed: string,
    placeId: string | null,
    latitude: number | null,
    longitude: number | null
  ) => {
    if (!id || !activeProfessionCode) return;
    setLoading(true);
    updateProfile(
      {
        id,
        business_address: trimmed,
        business_place_id: placeId,
        business_latitude: latitude,
        business_longitude: longitude,
        profession_code: activeProfessionCode,
      },
      {
        onSuccess: () => {
          /**
           * `useUpdateSupabaseProfile` re-fetches `/api/auth/me` and replaces
           * the entire profile, so `professions_detail` for the active lane
           * will come back with the saved address. We clear the local "edited"
           * flag so the sync effect above accepts the fresh server value.
           */
          setHasEdited(false);
          setLoading(false);
          setError(false);
          Keyboard.dismiss();
        },
        onError: (err) => {
          setLoading(false);
          Alert.alert(
            "Failed to update profile",
            err instanceof Error ? err.message : "Please try again."
          );
        },
      }
    );
  };

  return (
    <MintProfileScreenShell>
      <TopNav
        title="Salon address"
        showSaveButton
        saveChanged={changed}
        saveAction={updateUserProfile}
        loading={loading}
      />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={mintProfileScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <BrandAddressAutocompleteField
            label="Salon address"
            value={address}
            onChangeText={handleAddressChange}
            onPlaceSelected={setPlaceDetails}
            countryCode={
              profileCountry.length === 2 ? profileCountry : undefined
            }
          />
          {attemptedSubmit && error ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default SalonAddress;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  errorText: {
    ...Typography.outfitRegular16,
    color: "#C62828",
    marginTop: scale(8),
  },
});
