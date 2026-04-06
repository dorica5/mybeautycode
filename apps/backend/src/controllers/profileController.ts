import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  professionalProfileApiSelect,
  serializeProfileForApi,
} from "../lib/serializeProfileForApi";
import { profileService } from "../services/profileService";
import { professionService } from "../services/professionService";

export const profileController = {
  async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const profile = await profileService.getById(id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
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
        include: {
          professionalProfile: { select: professionalProfileApiSelect },
        },
      });
      if (!fresh) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(serializeProfileForApi(fresh));
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) {
        return res.status(409).json({ error: e.message });
      }
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      console.error("profile update error:", err);
      res.status(500).json({ error: "Failed to update profile" });
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
      const results = await profileService.searchClients(
        String(q),
        professionalProfileId
      );
      res.json(results);
    } catch (err) {
      console.error("profile searchClients error:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  },

  async searchClientsWithRelationship(req: Request, res: Response) {
    const { q } = req.query;
    const hairdresserId = req.userId;
    if (!q || !hairdresserId) {
      return res.status(400).json({ error: "q required" });
    }
    try {
      const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
        hairdresserId!
      );
      const results = await profileService.searchClientsWithRelationship(
        String(q),
        professionalProfileId
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
};
