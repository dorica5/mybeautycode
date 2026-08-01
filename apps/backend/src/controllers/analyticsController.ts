import { Request, Response } from "express";
import { activityLogService } from "../services/activityLogService";

export const analyticsController = {
  async recordEvent(req: Request, res: Response) {
    const body = req.body as {
      eventType?: string;
      entityType?: string | null;
      entityId?: string | null;
      payload?: Record<string, unknown> | null;
    };

    if (!body.eventType?.trim()) {
      return res.status(400).json({ error: "eventType is required" });
    }

    try {
      await activityLogService.record(req.userId, {
        eventType: body.eventType,
        entityType: body.entityType,
        entityId: body.entityId,
        payload: body.payload,
      });
      res.status(204).end();
    } catch (err) {
      console.error("analytics recordEvent error:", err);
      res.status(500).json({ error: "Failed to record event" });
    }
  },
};
