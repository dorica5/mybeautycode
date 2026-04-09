import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authService } from "../services/authService";
import { profileWithProfessionalForApiInclude } from "../lib/profileIncludes";
import { fetchProfessionCodesForProfile } from "../lib/professionCodesFromDb";
import {
  needsProfessionCodesSqlFallback,
  serializeProfileForApi,
} from "../lib/serializeProfileForApi";
import { profileService } from "../services/profileService";

export const authController = {
  async me(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        include: profileWithProfessionalForApiInclude,
      });
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      let professionCodesSqlFallback: string[] | undefined;
      if (
        profile.professionalProfile &&
        needsProfessionCodesSqlFallback(profile.professionalProfile)
      ) {
        professionCodesSqlFallback = await fetchProfessionCodesForProfile(
          userId
        );
      }
      const includeHairdresserOnlyFields = await profileService.hasHairProfession(
        userId
      );
      return res.json(
        serializeProfileForApi(profile, {
          professionCodesSqlFallback,
          includeHairdresserOnlyFields,
        })
      );
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
