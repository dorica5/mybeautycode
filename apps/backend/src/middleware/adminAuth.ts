import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "./auth";

/**
 * Admin access via:
 * 1) `X-Admin-Key` header matching ADMIN_METRICS_API_KEY (dashboard / scripts), or
 * 2) Bearer JWT for a user listed in `admin_users`.
 */
export const adminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const configuredKey = process.env.ADMIN_METRICS_API_KEY?.trim();
  const headerKey = req.headers["x-admin-key"];
  if (
    configuredKey &&
    typeof headerKey === "string" &&
    headerKey === configuredKey
  ) {
    return next();
  }

  authMiddleware(req, res, () => {
    void (async () => {
      if (!req.userId) {
        res.status(401).json({ error: "Missing or invalid authorization" });
        return;
      }
      try {
        const admin = await prisma.adminUser.findUnique({
          where: { userId: req.userId },
        });
        if (!admin) {
          res.status(403).json({ error: "Admin access required" });
          return;
        }
        next();
      } catch (err) {
        console.error("adminAuth lookup error:", err);
        res.status(500).json({ error: "Admin authorization failed" });
      }
    })();
  });
};
