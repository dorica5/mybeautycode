import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";

/** Inbox list only shows notifications newer than this (calendar months from now). */
const NOTIFICATION_INBOX_MAX_AGE_MONTHS = 2;

function notificationInboxCutoff(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - NOTIFICATION_INBOX_MAX_AGE_MONTHS);
  return d;
}

/**
 * Inbox filter for `list`:
 *  - `undefined` -> all (legacy, no filtering)
 *  - `null`      -> only client inbox (`profession_code IS NULL`)
 *  - string      -> only that lane (`profession_code = "<lane>"`)
 */
export type NotificationInboxFilter = string | null | undefined;

/** Maps API / mobile semantic types to DB enum values. */
const NOTIFICATION_TYPE_MAP: Record<string, NotificationType> = {
  FRIEND_REQUEST: NotificationType.link_request,
  FRIEND_ACCEPTED: NotificationType.link_accepted,
  FRIEND_DECLINED: NotificationType.link_declined,
  HAIRCODE_ADDED: NotificationType.service_record,
};

function resolveDbNotificationType(input: string): NotificationType {
  const mapped = NOTIFICATION_TYPE_MAP[input];
  if (mapped) return mapped;
  const direct = Object.values(NotificationType).find((v) => v === input);
  if (direct) return direct as NotificationType;
  return NotificationType.other;
}

export const notificationService = {
  async send(
    senderId: string,
    recipientId: string,
    params: {
      type: string;
      message: string;
      title?: string;
      extraData?: Record<string, unknown>;
      /**
       * Which inbox the notification is delivered to:
       *   - `null` / `undefined` -> recipient's client inbox
       *   - `"hair"` / `"nails"` / `"brows"` -> that profession account's inbox
       */
      professionCode?: string | null;
    }
  ) {
    const mappedType = resolveDbNotificationType(params.type);
    const normalizedLane =
      typeof params.professionCode === "string" && params.professionCode.trim()
        ? params.professionCode.trim()
        : null;
    // Mirror the lane in `data` too so legacy UI (NotificationItem) that reads
    // `data.profession_code` keeps working for copy purposes.
    const mergedExtra: Record<string, unknown> | undefined = normalizedLane
      ? { ...(params.extraData ?? {}), profession_code: normalizedLane }
      : params.extraData;
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        message: params.message,
        type: mappedType,
        senderId,
        status: params.type === "FRIEND_REQUEST" ? "pending" : null,
        data: (mergedExtra ?? undefined) as object | undefined,
        professionCode: normalizedLane,
      },
    });
    const pushToken = await prisma.pushToken.findFirst({
      where: { userId: recipientId },
    });
    if (pushToken?.token) {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: pushToken.token,
          title: params.title ?? "Good News",
          body: params.message,
          data: {
            notificationId: notification.id,
            type: params.type,
            ...(mergedExtra ?? {}),
          },
          sound: "default",
          priority: "high",
        }),
      });
      if (!expoRes.ok) {
        console.error("Expo push error:", await expoRes.text());
      }
    }
    return notification;
  },

  async savePushToken(userId: string, token: string, deviceId?: string) {
    const existing = await prisma.pushToken.findFirst({
      where: { userId, deviceId: deviceId ?? null },
    });
    if (existing) {
      await prisma.pushToken.update({
        where: { id: existing.id },
        data: { token, updatedAt: new Date() },
      });
    } else {
      await prisma.pushToken.create({
        data: { userId, token, deviceId },
      });
    }
    return { success: true };
  },

  async list(userId: string, inbox: NotificationInboxFilter = undefined) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      createdAt: { gte: notificationInboxCutoff() },
    };
    if (inbox === null) {
      where.professionCode = null;
    } else if (typeof inbox === "string" && inbox.trim()) {
      where.professionCode = inbox.trim();
    }
    /** One round-trip via relation — avoids P1017 when the pool drops between two queries. */
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map(({ sender: senderRow, ...n }) => ({
      ...n,
      sender_id: n.senderId,
      sender: senderRow
        ? {
            full_name: profileDisplayName(senderRow),
            avatar_url: senderRow.avatarUrl,
          }
        : null,
      data: n.data,
    }));
  },

  async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  },

  async getFriendRequestStatus(senderId: string, userId: string) {
    const n = await prisma.notification.findFirst({
      where: {
        senderId,
        userId,
        type: "link_request",
      },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    return n?.status ?? null;
  },

  async getById(notificationId: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
  },

  async respondToFriendRequest(
    notificationId: string,
    userId: string,
    accepted: boolean
  ) {
    const n = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) {
      throw Object.assign(new Error("Notification not found"), { statusCode: 404 });
    }

    const rawData = n.data as Record<string, unknown> | null | undefined;
    const linkId =
      rawData && typeof rawData.clientProfessionalLinkId === "string"
        ? rawData.clientProfessionalLinkId
        : null;

    // Resolve the profession lane upfront (before any delete on decline) so
    // we can stamp it onto the accepted notification's `data` and use it as
    // the echo-inbox for the follow-up notification to the pro.
    let linkProfessionCode: string | null = null;
    if (linkId) {
      const existingLink = await prisma.clientProfessionalLink.findUnique({
        where: { id: linkId },
        select: { profession: { select: { code: true } } },
      });
      linkProfessionCode = existingLink?.profession?.code?.trim() || null;
    }

    let linkResponded = false;
    if (linkId) {
      const link = await prisma.clientProfessionalLink.findFirst({
        where: {
          id: linkId,
          clientUserId: userId,
          status: "pending",
        },
      });
      if (link) {
        linkResponded = true;
        if (accepted) {
          await prisma.clientProfessionalLink.update({
            where: { id: linkId },
            data: {
              status: "active",
              statusChangedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.clientProfessionalLink.delete({
            where: { id: linkId },
          });
        }
      }
    }

    // Enrich the accepted notification's data with the lane so UI copy
    // renders "X is now your hairdresser / nail technician / brow stylist"
    // even if the original request predates profession-code propagation.
    const enrichedData: Record<string, unknown> = {
      ...(rawData ?? {}),
    };
    if (linkProfessionCode && !enrichedData.profession_code) {
      enrichedData.profession_code = linkProfessionCode;
    }

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: {
        status: accepted ? "accepted" : "rejected",
        read: true,
        data: enrichedData as object,
      },
    });

    if (linkResponded && n.type === "link_request" && n.senderId) {
      const clientProfile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const clientName = profileDisplayName(clientProfile ?? {});
      const proInboxLane = linkProfessionCode;
      if (accepted) {
        await notificationService.send(userId, n.senderId, {
          type: "FRIEND_ACCEPTED",
          message: `${clientName} accepted your connection request`,
          title: "Request accepted",
          extraData: { clientProfessionalLinkId: linkId },
          professionCode: proInboxLane,
        });
      } else {
        await notificationService.send(userId, n.senderId, {
          type: "FRIEND_DECLINED",
          message: `${clientName} declined your connection request`,
          title: "Request declined",
          professionCode: proInboxLane,
        });
      }
    }
  },
};
