import { Request, Response } from "express";
import { adminMetricsService } from "../services/adminMetricsService";

export const adminController = {
  async getMetrics(_req: Request, res: Response) {
    try {
      const metrics = await adminMetricsService.getMetrics();
      res.json(metrics);
    } catch (err) {
      console.error("admin getMetrics error:", err);
      res.status(500).json({ error: "Failed to load admin metrics" });
    }
  },
};
