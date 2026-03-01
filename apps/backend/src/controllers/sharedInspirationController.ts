import { Request, Response } from "express";
import { sharedInspirationService } from "../services/sharedInspirationService";

export const sharedInspirationController = {
  async create(req: Request, res: Response) {
    const senderId = req.userId!;
    const { recipient_id, batch_id, items } = req.body;
    if (!recipient_id || !batch_id || !items?.length) {
      return res.status(400).json({
        error: "recipient_id, batch_id and items required",
      });
    }
    try {
      await sharedInspirationService.create(
        senderId,
        recipient_id,
        batch_id,
        items
      );
      res.json({ success: true });
    } catch (err) {
      console.error("sharedInspiration create error:", err);
      res.status(500).json({ error: "Failed to share inspiration" });
    }
  },

  async listByBatch(req: Request, res: Response) {
    const batchId = req.query.batch_id as string;
    const recipientId = req.userId!;
    if (!batchId) {
      return res.status(400).json({ error: "batch_id required" });
    }
    try {
      const imageUrls = await sharedInspirationService.listByBatch(batchId, recipientId);
      res.json(imageUrls);
    } catch (err) {
      console.error("sharedInspiration listByBatch error:", err);
      res.status(500).json({ error: "Failed to fetch shared inspirations" });
    }
  },

  async accept(req: Request, res: Response) {
    const recipientId = req.userId!;
    const { batch_id, image_url, image_urls } = req.body;
    const urls = image_urls ?? (image_url ? [image_url] : []);
    if (!batch_id || urls.length === 0) {
      return res.status(400).json({ error: "batch_id and image_url or image_urls required" });
    }
    try {
      const result = await sharedInspirationService.accept(recipientId, batch_id, urls);
      res.json(result);
    } catch (err) {
      console.error("sharedInspiration accept error:", err);
      res.status(500).json({ error: "Failed to accept shared inspirations" });
    }
  },

  async reject(req: Request, res: Response) {
    const recipientId = req.userId!;
    const { image_url, image_urls } = req.body;
    const urls = image_urls ?? (image_url ? [image_url] : []);
    if (urls.length === 0) {
      return res.status(400).json({ error: "image_url or image_urls required" });
    }
    try {
      await sharedInspirationService.reject(recipientId, urls);
      res.json({ success: true });
    } catch (err) {
      console.error("sharedInspiration reject error:", err);
      res.status(500).json({ error: "Failed to reject shared inspirations" });
    }
  },
};
