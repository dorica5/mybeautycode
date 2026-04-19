import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { profileWithProfessionalForApiInclude } from "../lib/profileIncludes";
import { fetchProfessionCodesForProfile } from "../lib/professionCodesFromDb";
import {
  needsProfessionCodesSqlFallback,
  serializeProfileForApi,
} from "../lib/serializeProfileForApi";
import { profileService } from "../services/profileService";
import { professionService } from "../services/professionService";
import { publicProfileWorkService } from "../services/publicProfileWorkService";
import { readProfessionCodeQuery } from "../lib/readProfessionCodeQuery";

export const profileController = {
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const profile = await profileService.getById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      let professionCodesSqlFallback: string[] | undefined;
      if (
        profile.professionalProfile &&
        needsProfessionCodesSqlFallback(profile.professionalProfile)
      ) {
        professionCodesSqlFallback = await fetchProfessionCodesForProfile(id);
      }
      res.json(
        serializeProfileForApi(profile, {
          professionCodesSqlFallback,
        })
      );
    } catch (err) {
      console.error("profile getById error:", err);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.userId;
    if (userId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await profileService.update(id, req.body);
      const fresh = await prisma.profile.findUnique({
        where: { id },
        include: profileWithProfessionalForApiInclude,
      });
      if (!fresh) {
        return res.status(404).json({ error: "Profile not found" });
      }
      let professionCodesSqlFallback: string[] | undefined;
      if (
        fresh.professionalProfile &&
        needsProfessionCodesSqlFallback(fresh.professionalProfile)
      ) {
        professionCodesSqlFallback = await fetchProfessionCodesForProfile(id);
      }
      res.json(
        serializeProfileForApi(fresh, {
          professionCodesSqlFallback,
        })
      );
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) {
        return res.status(409).json({ error: e.message });
      }
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("profile update Prisma:", err.code, err.message);
        return res.status(500).json({
          error: `Database error (${err.code}). Run prisma migrations against this database. ${err.message}`,
        });
      }
      console.error("profile update error:", err);
      const msg =
        process.env.NODE_ENV !== "production" && err instanceof Error
          ? err.message
          : "Failed to update profile";
      res.status(500).json({ error: msg });
    }
  },

  async searchClients(req: Request, res: Response) {
    const { q, hairdresserId } = req.query;
    if (!q || !hairdresserId) {
      return res.status(400).json({ error: "q and hairdresserId required" });
    }
    try {
      const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
        String(hairdresserId)
      );
      const professionCode =
        typeof req.query.professionCode === "string"
          ? req.query.professionCode
          : typeof req.query.profession_code === "string"
            ? req.query.profession_code
            : undefined;
      const results = await profileService.searchClients(
        String(q),
        professionalProfileId,
        professionCode
      );
      res.json(results);
    } catch (err) {
      console.error("profile searchClients error:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  },

  async searchClientsWithRelationship(req: Request, res: Response) {
    const qRaw = req.query.q;
    const q = typeof qRaw === "string" ? qRaw : "";
    const hairdresserId = req.userId;
    if (!hairdresserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
        hairdresserId!
      );
      const professionCode = readProfessionCodeQuery(req.query);
      const results = await profileService.searchClientsWithRelationship(
        q,
        professionalProfileId,
        professionCode
      );
      res.json(results);
    } catch (err) {
      console.error("profile searchClientsWithRelationship error:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  },

  async searchHairdressersWithRelationship(req: Request, res: Response) {
    const { q } = req.query;
    const clientId = req.userId;
    if (!q || !clientId) {
      return res.status(400).json({ error: "q required" });
    }
    try {
      const results = await profileService.searchProfessionalsWithRelationship(
        String(q),
        clientId!
      );
      res.json(results);
    } catch (err) {
      console.error("profile searchHairdressersWithRelationship error:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  },

  /** Public portfolio images (any authenticated user). */
  async listPublicWorkImages(req: Request, res: Response) {
    const ownerId = String(req.params.id ?? "").trim();
    const profession =
      typeof req.query.profession === "string" && req.query.profession.trim()
        ? req.query.profession.trim()
        : "hair";
    if (!ownerId) {
      return res.status(400).json({ error: "id required" });
    }
    try {
      const data = await publicProfileWorkService.listForOwner(ownerId, profession);
      res.json(data);
    } catch (err) {
      console.error("listPublicWorkImages error:", err);
      res.status(500).json({ error: "Failed to fetch portfolio images" });
    }
  },

  async addPublicWorkImage(req: Request, res: Response) {
    const ownerId = String(req.params.id ?? "").trim();
    const userId = req.userId;
    if (!ownerId || userId !== ownerId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const body = req.body as {
      profession_code?: string;
      image_url?: string;
      low_res_image_url?: string | null;
    };
    try {
      const row = await publicProfileWorkService.addForOwner(
        ownerId,
        String(body.profession_code ?? "hair"),
        String(body.image_url ?? ""),
        body.low_res_image_url
      );
      res.json(row);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      console.error("addPublicWorkImage error:", err);
      res.status(500).json({ error: "Failed to add image" });
    }
  },

  async deletePublicWorkImage(req: Request, res: Response) {
    const ownerId = String(req.params.id ?? "").trim();
    const imageId = String(req.params.imageId ?? "").trim();
    const userId = req.userId;
    if (!ownerId || userId !== ownerId || !imageId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await publicProfileWorkService.deleteForOwner(ownerId, imageId);
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) {
        return res.status(404).json({ error: e.message });
      }
      console.error("deletePublicWorkImage error:", err);
      res.status(500).json({ error: "Failed to delete image" });
    }
  },
};
