import { Request, Response } from "express";
import { moderationService } from "../services/moderationService";

export const moderationController = {
  async block(req: Request, res: Response) {
    const blockerId = req.userId!;
    const { blocked_id, reason, profession_code, professionCode } = req.body;
    const laneRaw =
      typeof profession_code === "string"
        ? profession_code
        : typeof professionCode === "string"
          ? professionCode
          : "";
    if (!blocked_id) {
      return res.status(400).json({ error: "blocked_id required" });
    }
    if (!laneRaw.trim()) {
      return res.status(400).json({ error: "profession_code is required" });
    }
    try {
      await moderationService.block(
        blockerId,
        blocked_id,
        reason ?? "User blocked",
        laneRaw.trim()
      );
      res.json({ success: true });
    } catch (err) {
      console.error("moderation block error:", err);
      res.status(500).json({ error: "Failed to block user" });
    }
  },

  async unblock(req: Request, res: Response) {
    const blockerId = req.userId!;
    const { blocked_id, profession_code, professionCode } = req.body;
    const laneRaw =
      typeof profession_code === "string"
        ? profession_code
        : typeof professionCode === "string"
          ? professionCode
          : "";
    if (!blocked_id) {
      return res.status(400).json({ error: "blocked_id required" });
    }
    if (!laneRaw.trim()) {
      return res.status(400).json({ error: "profession_code is required" });
    }
    try {
      await moderationService.unblock(blockerId, blocked_id, laneRaw.trim());
      res.json({ success: true });
    } catch (err) {
      console.error("moderation unblock error:", err);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  },

  async getBlockedIds(req: Request, res: Response) {
    const blockerId = req.userId!;
    try {
      const ids = await moderationService.getBlockedIds(blockerId);
      res.json(ids);
    } catch (err) {
      console.error("moderation getBlockedIds error:", err);
      res.status(500).json({ error: "Failed to fetch blocked ids" });
    }
  },

  async getAllBlockerIds(req: Request, res: Response) {
    const blockedId = req.query.blocked_id ?? req.userId;
    const profession_code =
      typeof req.query.profession_code === "string"
        ? req.query.profession_code
        : typeof req.query.professionCode === "string"
          ? req.query.professionCode
          : undefined;
    if (!blockedId) {
      return res.status(400).json({ error: "blocked_id required" });
    }
    try {
      const ids = await moderationService.getAllBlockerIds(
        String(blockedId),
        profession_code
      );
      res.json(ids);
    } catch (err) {
      console.error("moderation getAllBlockerIds error:", err);
      res.status(500).json({ error: "Failed to fetch blocker ids" });
    }
  },

  async getUserStatus(req: Request, res: Response) {
    const userId = req.query.user_id ?? req.userId;
    if (!userId) {
      return res.status(400).json({ error: "user_id required" });
    }
    try {
      const status = await moderationService.getUserStatus(String(userId));
      res.json(status);
    } catch (err) {
      console.error("moderation getUserStatus error:", err);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  },

  async report(req: Request, res: Response) {
    const reporterId = req.userId!;
    const { reported_id, reason, additional_details } = req.body;
    if (!reported_id || !reason) {
      return res.status(400).json({ error: "reported_id and reason required" });
    }
    try {
      const result = await moderationService.report(
        reporterId,
        reported_id,
        reason,
        additional_details
      );
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to report";
      res.status(400).json({ error: msg });
    }
  },
};
