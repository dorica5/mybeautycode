import { Request, Response } from "express";
import { salonService } from "../services/salonService";
import { parseDiscoveryCategoryForProfession } from "../lib/profDiscoveryCategories";

/** Raw query tokens for discovery filter (comma list + legacy single/multi param). */
function gatherDiscoveryTokensFromQuery(q: Request["query"]): string[] {
  const tokens: string[] = [];
  const multi = q.discovery_categories ?? q.discoveryCategories;
  if (typeof multi === "string" && multi.trim()) {
    for (const part of multi.split(",")) {
      const t = part.trim();
      if (t) tokens.push(t);
    }
  }
  const single = q.discovery_category ?? q.discoveryCategory;
  if (single !== undefined) {
    const parts = Array.isArray(single) ? single : [single];
    for (const x of parts) {
      if (typeof x === "string" && x.trim()) tokens.push(x.trim());
    }
  }
  return [...new Set(tokens)];
}

function normalizeDiscoveryCategoriesForRequest(
  profession: string | undefined,
  tokens: string[]
): string[] {
  const out = new Set<string>();
  const prof = profession?.trim();
  if (tokens.length === 0 || !prof) return [];
  for (const t of tokens) {
    const normalized = parseDiscoveryCategoryForProfession(prof, t);
    if (!normalized) {
      throw Object.assign(new Error(`Invalid discovery category for this profession.`),
        { statusCode: 400 }
      );
    }
    out.add(normalized);
  }
  return [...out].sort();
}

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
      const viewerId = req.userId ?? null;
      const profession = readProfessionCode(req.query);
      const discoveryTokens = gatherDiscoveryTokensFromQuery(req.query);
      if (discoveryTokens.length > 0 && !profession) {
        return res.status(400).json({
          error:
            "profession_code is required when discovery categories are set.",
        });
      }
      let discoveryNormalized: string[] | null = null;
      try {
        const codes = normalizeDiscoveryCategoriesForRequest(
          profession,
          discoveryTokens
        );
        discoveryNormalized = codes.length ? codes : null;
      } catch (e: unknown) {
        const er = e as Error & { statusCode?: number };
        if (er.statusCode === 400) {
          return res.status(400).json({ error: er.message });
        }
        throw e;
      }
      const results = await salonService.findInBounds(
        { neLat, neLng, swLat, swLng },
        profession,
        viewerId,
        discoveryNormalized
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
      const profession = readProfessionCode(req.query);
      const discoveryTokens = gatherDiscoveryTokensFromQuery(req.query);
      if (discoveryTokens.length > 0 && !profession) {
        return res.status(400).json({
          error:
            "profession_code is required when discovery categories are set.",
        });
      }
      let discoveryNormalized: string[] | null = null;
      try {
        const codes = normalizeDiscoveryCategoriesForRequest(
          profession,
          discoveryTokens
        );
        discoveryNormalized = codes.length ? codes : null;
      } catch (e: unknown) {
        const er = e as Error & { statusCode?: number };
        if (er.statusCode === 400) {
          return res.status(400).json({ error: er.message });
        }
        throw e;
      }
      const results = await salonService.listProfessionals(
        salonId,
        viewerId,
        profession,
        discoveryNormalized
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
