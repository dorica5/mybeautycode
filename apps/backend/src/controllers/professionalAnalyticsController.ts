import { Request, Response } from "express";
import { professionalAnalyticsService } from "../services/professionalAnalyticsService";

const EVENTS = new Set(["profile_view", "booking_click", "social_click"]);

function readProfessionCode(q: Request["query"]): string | undefined {
  const raw =
    typeof q.profession_code === "string"
      ? q.profession_code
      : typeof q.professionCode === "string"
        ? q.professionCode
        : undefined;
  if (!raw) return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

export const professionalAnalyticsController = {
  /** POST /api/professional-analytics/events  body: { subject_profile_id, profession_code?, event } */
  async recordEvent(req: Request, res: Response) {
    const viewerId = req.userId;
    if (!viewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const body = req.body as {
      subject_profile_id?: string;
      profession_code?: string | null;
      event?: string;
      /** instagram | tiktok | anything else → other bucket */
      social_platform?: string | null;
    };
    const subject = String(body.subject_profile_id ?? "").trim();
    const event = body.event;
    if (!subject) {
      return res.status(400).json({ error: "subject_profile_id is required." });
    }
    if (!event || !EVENTS.has(event)) {
      return res.status(400).json({ error: "Invalid event." });
    }
    try {
      const result = await professionalAnalyticsService.recordEvent({
        subjectProfileId: subject,
        viewerProfileId: viewerId,
        professionCode: body.profession_code,
        event: event as "profile_view" | "booking_click" | "social_click",
        socialPlatform:
          event === "social_click" ? body.social_platform : undefined,
      });
      res.json(result);
    } catch (err) {
      console.error("professional analytics recordEvent:", err);
      res.status(500).json({ error: "Failed to record event" });
    }
  },

  /** GET /api/professional-analytics/me?profession_code=hair */
  async me(req: Request, res: Response) {
    const ownerId = req.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const stats = await professionalAnalyticsService.getStatsForProfileProfession({
        ownerProfileId: ownerId,
        professionCode: readProfessionCode(req.query),
      });
      if (!stats) {
        return res.status(404).json({ error: "No profession row for this account." });
      }
      res.json(stats);
    } catch (err) {
      console.error("professional analytics me:", err);
      res.status(500).json({ error: "Failed to load stats" });
    }
  },
};
