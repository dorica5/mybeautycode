import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
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
      });
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      /** Separate query so a corrupt `professional_profiles` row cannot break `/me`. */
      let professionalProfile: { id: string } | null = null;
      try {
        professionalProfile = await prisma.professionalProfile.findUnique({
          where: { profileId: userId },
          select: { id: true },
        });
      } catch (profErr) {
        console.error("auth me professionalProfile lookup:", profErr);
      }
      const payload = serializeProfileForApi({
        ...profile,
        professionalProfile,
      });
      return res.json(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const dbUnreachable =
        /Can't reach database server|PrismaClientInitializationError|P1001/i.test(
          msg
        );
      if (dbUnreachable) {
        console.error(
          "auth me: database unreachable (resume Supabase / fix DATABASE_URL):",
          msg.slice(0, 500)
        );
        return res.status(503).json({
          error: "Database unavailable",
          hint: "Supabase project may be paused or DATABASE_URL unreachable. GET /health/db for details.",
        });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(
          "auth me prisma:",
          err.code,
          err.meta,
          err.message
        );
      } else {
        console.error("auth me error:", err);
      }
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
