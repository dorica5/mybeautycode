import { Request, Response } from "express";
import { adminMetricsService } from "../services/adminMetricsService";

export const adminController = {
  /** Public — confirms env is wired without exposing secrets. */
  status(_req: Request, res: Response) {
    res.json({
      adminKeyConfigured: Boolean(process.env.ADMIN_METRICS_API_KEY?.trim()),
    });
  },

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
