import { Request, Response } from "express";
import { profileService } from "../services/profileService";

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
      const profile = await profileService.update(id, req.body);
      res.json(profile);
    } catch (err) {
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
      const results = await profileService.searchClients(
        String(q),
        String(hairdresserId)
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
      const results = await profileService.searchClientsWithRelationship(
        String(q),
        hairdresserId
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
      const results = await profileService.searchHairdressersWithRelationship(
        String(q),
        clientId
      );
      res.json(results);
    } catch (err) {
      console.error("profile searchHairdressersWithRelationship error:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  },
};
