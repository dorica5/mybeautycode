import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authService } from "../services/authService";
import { serializeProfileForApi } from "../lib/serializeProfileForApi";

export const authController = {
  async me(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        include: { professionalProfile: { select: { id: true } } },
      });
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json(serializeProfileForApi(profile));
    } catch (err) {
      console.error("auth me error:", err);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  },

  async status(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const status = await authService.getUserStatus(userId);
      res.json(status);
    } catch (err) {
      console.error("auth status error:", err);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  },
};
