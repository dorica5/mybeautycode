import { Request, Response } from "express";
import { feedbackService } from "../services/feedbackService";
import { isUuid } from "../lib/isUuid";

export const feedbackController = {
  async list(req: Request, res: Response) {
    const userId = req.userId!;
    try {
      const items = await feedbackService.listForViewer(userId);
      res.json(items);
    } catch (err) {
      console.error("feedback list error:", err);
      res.status(500).json({ error: "Failed to load feedback" });
    }
  },

  async submit(req: Request, res: Response) {
    const userId = req.userId!;
    const body = req.body as {
      title?: string;
      description?: string;
      type?: string;
      screenshot_paths?: string[];
    };
    try {
      const item = await feedbackService.submit(userId, {
        title: String(body.title ?? ""),
        description: body.description,
        type: body.type,
        screenshot_paths: body.screenshot_paths,
      });
      res.status(201).json(item);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      console.error("feedback submit error:", err);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  },

  async toggleVote(req: Request, res: Response) {
    const userId = req.userId!;
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid feedback id." });
    }
    try {
      const result = await feedbackService.toggleVote(userId, id);
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) {
        return res.status(404).json({ error: e.message });
      }
      console.error("feedback vote error:", err);
      res.status(500).json({ error: "Failed to update vote" });
    }
  },
};
