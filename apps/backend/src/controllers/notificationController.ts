import { Request, Response } from "express";
import { notificationService } from "../services/notificationService";

export const notificationController = {
  async send(req: Request, res: Response) {
    const senderId = req.userId!;
    const { recipient_id, type, message, title, extra_data } = req.body;
    if (!recipient_id || !message) {
      return res.status(400).json({ error: "recipient_id and message required" });
    }
    try {
      await notificationService.send(senderId, recipient_id, {
        type: type ?? "GENERAL",
        message,
        title,
        extraData: extra_data,
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
    try {
      const data = await notificationService.list(userId);
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
