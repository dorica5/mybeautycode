import { Request, Response } from "express";
import { authService } from "../services/authService";

function profileToSnakeCase(p: Record<string, unknown>) {
  const map: Record<string, string> = {
    updatedAt: "updated_at",
    fullName: "full_name",
    avatarUrl: "avatar_url",
    phoneNumber: "phone_number",
    setupStatus: "setup_status",
    signupDate: "signup_date",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === "professionalProfile") {
      const pp = v as Record<string, unknown> | null;
      if (pp) {
        out.display_name = pp.displayName;
        out.business_name = pp.businessName;
        out.business_number = pp.businessNumber;
        out.about_me = pp.aboutMe;
        out.social_media = pp.socialMedia;
        out.booking_site = pp.bookingSite;
      }
      continue;
    }
    const key = map[k] ?? k;
    out[key] = v;
  }
  return out;
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
      res.json(profileToSnakeCase(profile as Record<string, unknown>));
    } catch (err) {
      console.error("auth me error:", err);
      res.status(500).json({ error: "Failed to fetch profile" });
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
