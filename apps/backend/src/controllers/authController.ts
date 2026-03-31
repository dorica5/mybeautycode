import { Request, Response } from "express";
import type { Profile } from "@prisma/client";
import { profileDisplayName } from "../lib/profileDisplay";
import { authService } from "../services/authService";

/** Stable JSON for clients — avoids Prisma/runtime fields breaking serialization. */
function profileMePayload(profile: Profile) {
  return {
    id: profile.id,
    email: profile.email ?? null,
    created_at: profile.createdAt?.toISOString?.() ?? null,
    updated_at: profile.updatedAt?.toISOString?.() ?? null,
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    username: profile.username ?? null,
    /** Derived for older clients; prefer first_name + last_name. */
    full_name: profileDisplayName(profile),
    country: profile.country ?? null,
    avatar_url: profile.avatarUrl ?? null,
    phone_number: profile.phoneNumber ?? null,
    setup_status: profile.setupStatus ?? null,
    signup_date: profile.signupDate?.toISOString?.() ?? null,
  };
}

export const authController = {
  async me(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const profile = await authService.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json(profileMePayload(profile));
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
