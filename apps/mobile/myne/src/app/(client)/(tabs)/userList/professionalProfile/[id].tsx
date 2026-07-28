/* eslint-disable react/react-in-jsx-scope */
import React, { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ClientProfessionalProfileScreen } from "@/src/components/discover/ClientProfessionalProfileScreen";
import type { DiscoverProSource } from "@/src/components/discover/ClientProfessionalProfileScreen";

function normalizeRouteParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

/** Search / map pass `relationship=true` when the link is already active. */
function parseRelationshipRouteParam(
  value: string | string[] | undefined
): boolean | undefined {
  const raw = normalizeRouteParam(value);
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return undefined;
}

const ProfessionalProfileScreen = () => {
  const {
    id,
    profession,
    relationship: relationshipParam,
    source,
  } = useLocalSearchParams<{
    id: string | string[];
    profession?: string | string[];
    relationship?: string | string[];
    source?: string | string[];
  }>();
  const hairdresser_id = normalizeRouteParam(id);
  const routeProfessionRaw = useMemo(() => {
    const raw = normalizeRouteParam(profession);
    return raw?.trim() ? raw.trim() : null;
  }, [profession]);
  const relationshipFromRoute = useMemo(
    () => parseRelationshipRouteParam(relationshipParam),
    [relationshipParam]
  );
  const discoverySource = useMemo((): DiscoverProSource => {
    const raw = normalizeRouteParam(source);
    if (
      raw === "map" ||
      raw === "discover_search" ||
      raw === "global_search" ||
      raw === "notification"
    ) {
      return raw;
    }
    return "discover_search";
  }, [source]);

  if (!hairdresser_id) return null;

  return (
    <ClientProfessionalProfileScreen
      hairdresserId={hairdresser_id}
      routeProfessionRaw={routeProfessionRaw}
      relationshipFromRoute={relationshipFromRoute}
      discoverySource={discoverySource}
      onBack={() => router.back()}
    />
  );
};

export default ProfessionalProfileScreen;
