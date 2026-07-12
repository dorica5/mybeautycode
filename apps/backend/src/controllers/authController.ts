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
import { readProfessionCodeQuery } from "../lib/readProfessionCodeQuery";

export const authController = {
  async me(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      let profile = await prisma.profile.findUnique({
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
      const activeProfessionCode = readProfessionCodeQuery(
        req.query as Record<string, unknown>
      );
      return res.json(
        serializeProfileForApi(profile, {
          professionCodesSqlFallback,
          activeProfessionCode,
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

  async forgotPassword(req: Request, res: Response) {
    const body = req.body as { email?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    if (!email.trim()) {
      return res.status(400).json({
        error: "Email is required.",
        code: "invalid_email",
      });
    }

    try {
      const result = await authService.requestPasswordReset(email);
      if (!result.ok) {
        const status = result.code === "invalid_email" ? 400 : 500;
        const messages: Record<string, string> = {
          invalid_email: "Enter a valid email address.",
          send_failed: "Could not send password reset email. Try again later.",
        };
        return res.status(status).json({
          error: messages[result.code] ?? "Request failed.",
          code: result.code,
        });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("auth forgot-password error:", err);
      return res.status(500).json({
        error: "Could not send password reset email. Try again later.",
        code: "send_failed",
      });
    }
  },
};
