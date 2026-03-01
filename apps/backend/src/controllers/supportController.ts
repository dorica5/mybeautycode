import { Request, Response } from "express";
import { supportService } from "../services/supportService";

export const supportController = {
  async create(req: Request, res: Response) {
    const userId = req.userId!;
    const { subject, message, status, priority } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "message required" });
    }
    try {
      await supportService.create(userId, {
        subject,
        message: message.trim(),
        status,
        priority,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("support create error:", err);
      res.status(500).json({ error: "Failed to send support request" });
    }
  },
};
