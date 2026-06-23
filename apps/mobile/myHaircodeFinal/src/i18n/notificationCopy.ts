import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { clientAddedPushBody } from "./pushCopy";
import type { I18nTranslate } from "./moderationLabels";

export type NotificationLike = {
  type?: string;
  status?: string;
  message?: string;
  sender?: { full_name?: string };
  data?: Record<string, unknown>;
};

function senderNameFrom(notification: NotificationLike): string | null {
  const fromSender =
    typeof notification.sender?.full_name === "string" &&
    notification.sender.full_name.trim()
      ? notification.sender.full_name.trim()
      : null;
  if (fromSender) return fromSender;
  const fromData =
    typeof notification.data?.senderName === "string" &&
    notification.data.senderName.trim()
      ? notification.data.senderName.trim()
      : null;
  return fromData;
}

function professionCodeFrom(
  data: Record<string, unknown> | undefined
): ProfessionChoiceCode | null {
  const raw = data?.profession_code ?? data?.professionCode;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return coerceProfessionCode(raw);
}

function normalizeNotificationType(type?: string): string {
  if (!type) return "other";
  switch (type) {
    case "link_request":
      return "FRIEND_REQUEST";
    case "link_accepted":
      return "FRIEND_ACCEPTED";
    case "link_declined":
      return "FRIEND_DECLINED";
    case "shared_inspiration":
      return "INSPIRATION_SHARED";
    case "service_record":
      return "HAIRCODE_ADDED";
    default:
      return type;
  }
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

export function professionRoleLabelFromCode(
  t: I18nTranslate,
  code: string | null | undefined
): string {
  const c = coerceProfessionCode(code ?? undefined);
  switch (c) {
    case "hair":
      return t("profession.roleHair");
    case "barber":
      return t("profession.roleBarber");
    case "nails":
      return t("profession.roleNails");
    case "brows_lashes":
      return t("profession.roleBrows");
    default:
      return t("profession.roleProfessional");
  }
}

/** Map legacy English role nouns from stored messages to profession lanes. */
function professionFromEnglishRole(role: string): ProfessionChoiceCode | null {
  const r = role.trim().toLowerCase();
  if (r.includes("hairdresser")) return "hair";
  if (r.includes("nail")) return "nails";
  if (r.includes("brow")) return "brows_lashes";
  if (r.includes("barber")) return "barber";
  if (r.includes("esthetician")) return "esthetician";
  return null;
}

function parseLegacyEnglishMessage(
  raw: string | undefined,
  t: I18nTranslate,
  fallbackName: string,
  professionCode: ProfessionChoiceCode | null
): string | null {
  if (!raw?.trim()) return null;
  const msg = raw.trim();

  let   m = msg.match(/^(.+?) (?:has )?accepted your connection request\.?$/i);
  if (m) return t("push.connectionAcceptedBody", { name: m[1].trim() });

  m = msg.match(/^(.+?) declined your connection request\.?$/i);
  if (m) return t("notifications.connectionDeclinedBody", { name: m[1].trim() });

  m = msg.match(/^(.+?) wants to connect with you on myne\.?$/i);
  if (m) {
    return t("notifications.wantsConnectOnBrand", {
      name: m[1].trim(),
      brand: BRAND_DISPLAY_NAME,
    });
  }

  m = msg.match(/^(.+?) wants to connect with you\.?$/i);
  if (m) return t("notifications.wantsConnect", { name: m[1].trim() });

  m = msg.match(/^(.+?) wants access to your visits\.?$/i);
  if (m) return t("notifications.wantsAccess", { name: m[1].trim() });

  m = msg.match(/^(.+?) shared inspiration with you\.?$/i);
  if (m) return t("push.inspirationSharedBody", { name: m[1].trim() });

  m = msg.match(/^(.+?) has added a new visit\.?$/i);
  if (m) return t("push.newVisitAddedBody", { name: m[1].trim() });

  m = msg.match(/^(.+?) has updated a visit\.?$/i);
  if (m) return t("notifications.visitEditedBody", { name: m[1].trim() });

  m = msg.match(/^(.+?) has added you as their (.+?)\.?$/i);
  if (m) {
    const lane =
      professionCode ?? professionFromEnglishRole(m[2]) ?? null;
    return clientAddedPushBody(t, m[1].trim(), lane);
  }

  m = msg.match(/^(.+?) added you\.?$/i);
  if (m) return t("notifications.connectedWithYou", { name: m[1].trim() });

  return null;
}

/**
 * Renders inbox notification text in the active app language.
 * Uses type + structured data when possible; falls back to parsing legacy English bodies.
 */
export function localizedNotificationMessage(
  notification: NotificationLike,
  t: I18nTranslate
): string {
  const name = senderNameFrom(notification) ?? t("common.someone");
  const type = normalizeNotificationType(notification.type);
  const data = notification.data;
  const professionCode = professionCodeFrom(data);
  const roleLabel = professionRoleLabelFromCode(t, professionCode);
  const isClientInitiatedLink = isTruthyFlag(data?.isClient);
  const isAccepted =
    notification.status === "accepted" || data?.status === "accepted";
  const isLinkType =
    type === "FRIEND_REQUEST" || type === "link_request";

  if (isLinkType) {
    if (isClientInitiatedLink) {
      return clientAddedPushBody(t, name, professionCode);
    }
    if (isAccepted) {
      return t("notifications.isNowYour", { name, role: roleLabel });
    }
    return t("notifications.wantsConnectOnBrand", {
      name,
      brand: BRAND_DISPLAY_NAME,
    });
  }

  switch (type) {
    case "FRIEND_ACCEPTED":
    case "link_accepted":
      return t("push.connectionAcceptedBody", { name });
    case "FRIEND_DECLINED":
    case "link_declined":
      return t("notifications.connectionDeclinedBody", { name });
    case "INSPIRATION_SHARED":
    case "shared_inspiration":
      return t("push.inspirationSharedBody", { name });
    case "HAIRCODE_EDITED":
      return t("notifications.visitEditedBody", { name });
    case "HAIRCODE_ADDED":
    case "service_record":
      return t("push.newVisitAddedBody", { name });
    default:
      break;
  }

  const parsed = parseLegacyEnglishMessage(
    notification.message,
    t,
    name,
    professionCode
  );
  if (parsed) return parsed;

  return notification.message?.trim() ?? "";
}
