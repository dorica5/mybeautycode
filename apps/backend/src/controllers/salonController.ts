import { Request, Response } from "express";
import { salonService } from "../services/salonService";

function readNumberQuery(value: unknown): number | null {
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function readProfessionCode(q: Request["query"]): string | undefined {
  const raw =
    typeof q.profession_code === "string"
      ? q.profession_code
      : typeof q.professionCode === "string"
        ? q.professionCode
        : undefined;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const salonController = {
  /** GET /api/salons/nearby?neLat&neLng&swLat&swLng&profession_code */
  async nearby(req: Request, res: Response) {
    const neLat = readNumberQuery(req.query.neLat ?? req.query.ne_lat);
    const neLng = readNumberQuery(req.query.neLng ?? req.query.ne_lng);
    const swLat = readNumberQuery(req.query.swLat ?? req.query.sw_lat);
    const swLng = readNumberQuery(req.query.swLng ?? req.query.sw_lng);
    if (neLat == null || neLng == null || swLat == null || swLng == null) {
      return res
        .status(400)
        .json({ error: "neLat, neLng, swLat, swLng are required." });
    }
    try {
      const results = await salonService.findInBounds(
        { neLat, neLng, swLat, swLng },
        readProfessionCode(req.query)
      );
      res.json(results);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      console.error("salon nearby error:", err);
      res.status(500).json({ error: "Failed to load salons" });
    }
  },

  /** GET /api/salons/:id/professionals?profession_code */
  async professionalsAtSalon(req: Request, res: Response) {
    const salonId = String(req.params.id ?? "").trim();
    const viewerId = req.userId;
    if (!salonId) {
      return res.status(400).json({ error: "Salon id required." });
    }
    if (!viewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const results = await salonService.listProfessionals(
        salonId,
        viewerId,
        readProfessionCode(req.query)
      );
      res.json(results);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) {
        return res.status(404).json({ error: e.message });
      }
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      console.error("salon professionalsAtSalon error:", err);
      res.status(500).json({ error: "Failed to load salon professionals" });
    }
  },
};
