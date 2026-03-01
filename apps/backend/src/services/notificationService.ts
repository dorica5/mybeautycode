import { prisma } from "../lib/prisma";

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
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        message: params.message,
        type: params.type,
        senderId,
        status: params.type === "FRIEND_REQUEST" ? "pending" : null,
        extraData: params.extraData
          ? JSON.stringify(params.extraData)
          : null,
      },
    });
    const pushToken = await prisma.pushToken.findUnique({
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
          data: { notificationId: notification.id, type: params.type, ...params.extraData },
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

  async savePushToken(userId: string, token: string) {
    const existing = await prisma.pushToken.findUnique({
      where: { userId },
    });
    if (existing) {
      await prisma.pushToken.update({
        where: { userId },
        data: { token, updatedAt: new Date() },
      });
    } else {
      await prisma.pushToken.create({
        data: { userId, token },
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
            select: { id: true, fullName: true, avatarUrl: true },
          })
        : [];
    const senderMap = Object.fromEntries(
      senders.map((s) => [s.id, { full_name: s.fullName, avatar_url: s.avatarUrl }])
    );
    return notifications.map((n) => ({
      ...n,
      sender_id: n.senderId,
      sender: n.senderId ? senderMap[n.senderId] : null,
      data: n.extraData ? (() => { try { return JSON.parse(n.extraData!); } catch { return null; } })() : null,
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
        type: "FRIEND_REQUEST",
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
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: accepted ? "accepted" : "rejected", read: true },
    });
  },
};
