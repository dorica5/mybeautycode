import { Request, Response } from "express";
import { inspirationService } from "../services/inspirationService";

export const inspirationController = {
  async listByOwner(req: Request, res: Response) {
    const ownerId = req.query.owner_id ?? req.userId;
    if (!ownerId) {
      return res.status(400).json({ error: "owner_id or auth required" });
    }
    try {
      const profession =
        typeof req.query.profession === "string" && req.query.profession.trim()
          ? req.query.profession.trim()
          : "hair";
      const data = await inspirationService.listByOwner(String(ownerId), profession);
      res.json(data);
    } catch (err) {
      console.error("inspiration listByOwner error:", err);
      res.status(500).json({ error: "Failed to fetch inspirations" });
    }
  },

  async create(req: Request, res: Response) {
    const body = req.body;
    try {
      const data = await inspirationService.create({
        owner_id: body.owner_id ?? req.userId,
        client_id: body.client_id,
        shared_by: body.shared_by,
        image_url: body.image_url,
        low_res_image_url: body.low_res_image_url,
        low_middle_res_url: body.low_middle_res_url,
        high_middle_res_url: body.high_middle_res_url,
        profession_id: body.profession_id,
        profession_code: body.profession_code,
      });
      res.json(data);
    } catch (err) {
      console.error("inspiration create error:", err);
      res.status(500).json({ error: "Failed to create inspiration" });
    }
  },

  async deleteByImageUrls(req: Request, res: Response) {
    const ownerId = req.userId!;
    const { imageUrls } = req.body as { imageUrls: string[] };
    if (!imageUrls?.length) {
      return res.status(400).json({ error: "imageUrls required" });
    }
    try {
      await inspirationService.deleteByImageUrls(ownerId, imageUrls);
      res.json({ success: true });
    } catch (err) {
      console.error("inspiration deleteByImageUrls error:", err);
      res.status(500).json({ error: "Failed to delete inspirations" });
    }
  },
};
