import { prisma } from "../lib/prisma";
import { profileDisplayName } from "../lib/profileDisplay";

const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  FRIEND_REQUEST: "link_request",
  FRIEND_ACCEPTED: "link_accepted",
  FRIEND_DECLINED: "link_declined",
};

export const notificationService = {
  async send(
    senderId: string,
    recipientId: string,
    params: {
      type: string;
      message: string;
      title?: string;
      extraData?: Record<string, unknown>;
    }
  ) {
    const mappedType = NOTIFICATION_TYPE_MAP[params.type] ?? params.type;
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        message: params.message,
        type: mappedType as "link_request" | "link_accepted" | "link_declined" | "shared_inspiration" | "service_record" | "system" | "support" | "other",
        senderId,
        status: params.type === "FRIEND_REQUEST" ? "pending" : null,
        data: (params.extraData ?? undefined) as object | undefined,
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
            ...params.extraData,
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

  async list(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const senderIds = [
      ...new Set(
        notifications
          .map((n) => n.senderId)
          .filter((id): id is string => !!id)
      ),
    ];
    const senders =
      senderIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          })
        : [];
    const senderMap = Object.fromEntries(
      senders.map((s) => [
        s.id,
        { full_name: profileDisplayName(s), avatar_url: s.avatarUrl },
      ])
    );
    return notifications.map((n) => ({
      ...n,
      sender_id: n.senderId,
      sender: n.senderId ? senderMap[n.senderId] : null,
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

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: accepted ? "accepted" : "rejected", read: true },
    });

    if (linkResponded && n.type === "link_request" && n.senderId) {
      const clientProfile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const clientName = profileDisplayName(clientProfile ?? {});
      if (accepted) {
        await notificationService.send(userId, n.senderId, {
          type: "FRIEND_ACCEPTED",
          message: `${clientName} accepted your connection request`,
          title: "Request accepted",
          extraData: { clientProfessionalLinkId: linkId },
        });
      } else {
        await notificationService.send(userId, n.senderId, {
          type: "FRIEND_DECLINED",
          message: `${clientName} declined your connection request`,
          title: "Request declined",
        });
      }
    }
  },
};
