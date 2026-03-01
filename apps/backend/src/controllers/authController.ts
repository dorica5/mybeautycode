import { Request, Response } from "express";
import { authService } from "../services/authService";

function profileToSnakeCase(p: Record<string, unknown>) {
  const map: Record<string, string> = {
    updatedAt: "updated_at",
    fullName: "full_name",
    avatarUrl: "avatar_url",
    phoneNumber: "phone_number",
    userType: "user_type",
    salonPhoneNumber: "salon_phone_number",
    salonName: "salon_name",
    aboutMe: "about_me",
    setupStatus: "setup_status",
    signupDate: "signup_date",
    socialMedia: "social_media",
    bookingSite: "booking_site",
    hairStructure: "hair_structure",
    hairThickness: "hair_thickness",
    greyHairPercentage: "grey_hair_percentage",
    naturalHairColor: "natural_hair_color",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
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
