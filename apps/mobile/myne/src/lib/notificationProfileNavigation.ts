import { Alert } from "react-native";
import { router, type Href } from "expo-router";
import {
  checkRelationship,
  getClientLinkUiStatus,
} from "@/src/api/relationships";
import {
  allBlockerIds,
  blockedIds,
  isBlockedOnLane,
} from "@/src/api/moderation";

export type NotificationProfileNavResult =
  | { kind: "blocked" }
  | {
      kind: "route";
      pathname: string;
      params: Record<string, string>;
    };

async function isProfileBlockedBetween(
  viewerId: string,
  otherId: string,
  professionCode: string | null | undefined
): Promise<boolean> {
  const lane = professionCode?.trim() || undefined;
  const [blockedByOther, viewerBlockedOther] = await Promise.all([
    allBlockerIds(viewerId, lane).then((ids) =>
      ids.some((id) => String(id) === String(otherId))
    ),
    blockedIds(viewerId).then((rows) =>
      isBlockedOnLane(rows, otherId, professionCode)
    ),
  ]);
  return blockedByOther || viewerBlockedOther;
}

/** Pro opens a client from a notification — hub only when link is active. */
export async function resolveProToClientProfileNav(
  proId: string,
  clientId: string,
  professionCode: string | null | undefined,
  meta?: {
    fullName?: string;
    phone?: string;
    linkPending?: boolean;
  }
): Promise<NotificationProfileNavResult> {
  if (await isProfileBlockedBetween(proId, clientId, professionCode)) {
    return { kind: "blocked" };
  }

  const status = await getClientLinkUiStatus(proId, clientId, professionCode);
  const lane = professionCode?.trim();
  const shared: Record<string, string> = {
    id: clientId,
    client_id: clientId,
    ...(meta?.fullName ? { full_name: meta.fullName } : {}),
    ...(meta?.phone ? { phone_number: meta.phone } : {}),
    ...(lane ? { professionCode: lane } : {}),
  };

  if (status === "active") {
    return {
      kind: "route",
      pathname: "/visits/[id]",
      params: { ...shared, relationship: "true" },
    };
  }

  return {
    kind: "route",
    pathname: "/(professional)/clientProfile/[id]",
    params: {
      ...shared,
      relationship: "false",
      ...(status === "pending" || meta?.linkPending
        ? { link_pending: "true" }
        : {}),
    },
  };
}

/** Client opens a pro from a notification — connected profile vs add-pro flow. */
export async function resolveClientToProProfileNav(
  clientId: string,
  proId: string,
  professionCode: string | null | undefined
): Promise<NotificationProfileNavResult> {
  if (await isProfileBlockedBetween(clientId, proId, professionCode)) {
    return { kind: "blocked" };
  }

  const isRelated = await checkRelationship(proId, clientId, professionCode);
  const lane = professionCode?.trim();

  return {
    kind: "route",
    pathname: "/(client)/(tabs)/userList/professionalProfile/[id]",
    params: {
      id: proId,
      relationship: isRelated ? "true" : "false",
      ...(lane ? { profession: lane } : {}),
    },
  };
}

export function pushNotificationProfileNav(
  resolved: NotificationProfileNavResult,
  t: (key: string) => string
): boolean {
  if (resolved.kind === "blocked") {
    Alert.alert(t("notifications.profileUnavailableBlocked"));
    return false;
  }
  router.push({
    pathname: resolved.pathname as Href,
    params: resolved.params,
  });
  return true;
}
