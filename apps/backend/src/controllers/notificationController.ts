import { Request, Response } from "express";
import {
  notificationService,
  type NotificationInboxFilter,
} from "../services/notificationService";

function readProfessionCodeBody(body: Record<string, unknown>): string | null {
  const raw = body.profession_code ?? body.professionCode;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/**
 * Parses the inbox query param for `GET /api/notifications`:
 *  - missing           -> undefined (return everything; legacy behavior)
 *  - "client"          -> null (only client-inbox notifications)
 *  - "hair"/"nails"/.. -> that lane
 */
function readInboxQuery(q: Record<string, unknown>): NotificationInboxFilter {
  const raw = q.profession_code ?? q.professionCode ?? q.inbox;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "client") return null;
  return trimmed;
}

export const notificationController = {
  async send(req: Request, res: Response) {
    const senderId = req.userId!;
    const { recipient_id, type, message, title, extra_data } = req.body;
    if (!recipient_id || !message) {
      return res.status(400).json({ error: "recipient_id and message required" });
    }
    const professionCode = readProfessionCodeBody(req.body);
    try {
      await notificationService.send(senderId, recipient_id, {
        type: type ?? "GENERAL",
        message,
        title,
        extraData: extra_data,
        professionCode,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("notification send error:", err);
      res.status(500).json({ error: "Failed to send notification" });
    }
  },

  async savePushToken(req: Request, res: Response) {
    const userId = req.userId!;
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "token required" });
    }
    try {
      await notificationService.savePushToken(userId, token);
      res.json({ success: true });
    } catch (err) {
      console.error("notification savePushToken error:", err);
      res.status(500).json({ error: "Failed to save push token" });
    }
  },

  async list(req: Request, res: Response) {
    const userId = req.userId!;
    const inbox = readInboxQuery(req.query as Record<string, unknown>);
    try {
      const data = await notificationService.list(userId, inbox);
      res.json(data);
    } catch (err) {
      console.error("notification list error:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },

  async markAsRead(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.userId!;
    try {
      await notificationService.markAsRead(id, userId);
      res.json({ success: true });
    } catch (err) {
      console.error("notification markAsRead error:", err);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.userId!;
    try {
      const data = await notificationService.getById(id, userId);
      if (!data) return res.status(404).json({ error: "Notification not found" });
      res.json(data);
    } catch (err) {
      console.error("notification getById error:", err);
      res.status(500).json({ error: "Failed to fetch notification" });
    }
  },

  async getFriendRequestStatus(req: Request, res: Response) {
    const senderId = req.query.sender_id as string;
    const userId = req.userId!;
    if (!senderId) {
      return res.status(400).json({ error: "sender_id required" });
    }
    try {
      const status = await notificationService.getFriendRequestStatus(senderId, userId);
      res.json({ status });
    } catch (err) {
      console.error("notification getFriendRequestStatus error:", err);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  },

  async respondToFriendRequest(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.userId!;
    const { accepted } = req.body;
    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) required" });
    }
    try {
      await notificationService.respondToFriendRequest(id, userId, accepted);
      res.json({ success: true });
    } catch (err) {
      console.error("notification respondToFriendRequest error:", err);
      res.status(500).json({ error: "Failed to respond" });
    }
  },
};
