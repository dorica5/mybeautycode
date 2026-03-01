import { Request, Response } from "express";
import { relationshipService } from "../services/relationshipService";

export const relationshipController = {
  async add(req: Request, res: Response) {
    const { hairdresser_id, client_id } = req.body;
    const userId = req.userId!;
    const clientId = client_id ?? userId;
    if (!hairdresser_id) {
      return res.status(400).json({ error: "hairdresser_id required" });
    }
    try {
      await relationshipService.add(hairdresser_id, clientId);
      res.json({ success: true });
    } catch (err) {
      console.error("relationship add error:", err);
      res.status(500).json({ error: "Failed to add relationship" });
    }
  },

  async remove(req: Request, res: Response) {
    const { hairdresserId, clientId } = req.body;
    if (!hairdresserId || !clientId) {
      return res.status(400).json({ error: "hairdresserId and clientId required" });
    }
    try {
      await relationshipService.remove(hairdresserId, clientId);
      res.json({ success: true });
    } catch (err) {
      console.error("relationship remove error:", err);
      res.status(500).json({ error: "Failed to remove relationship" });
    }
  },

  async checkExists(req: Request, res: Response) {
    const hairdresserId = req.query.hairdresser_id as string;
    const clientId = (req.query.client_id as string) ?? req.userId;
    if (!hairdresserId || !clientId) {
      return res.status(400).json({ error: "hairdresser_id and client_id required" });
    }
    try {
      const exists = await relationshipService.checkExists(hairdresserId, clientId);
      res.json({ exists });
    } catch (err) {
      console.error("relationship checkExists error:", err);
      res.status(500).json({ error: "Failed to check relationship" });
    }
  },

  async listByHairdresser(req: Request, res: Response) {
    const hairdresserId = req.query.hairdresser_id ?? req.userId;
    if (!hairdresserId) {
      return res.status(400).json({ error: "hairdresser_id or auth required" });
    }
    try {
      const data = await relationshipService.listByHairdresser(String(hairdresserId));
      res.json(data);
    } catch (err) {
      console.error("relationship listByHairdresser error:", err);
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  },

  async listByClient(req: Request, res: Response) {
    const clientId = req.query.client_id ?? req.userId;
    if (!clientId) {
      return res.status(400).json({ error: "client_id or auth required" });
    }
    try {
      const data = await relationshipService.listByClient(String(clientId));
      res.json(data);
    } catch (err) {
      console.error("relationship listByClient error:", err);
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  },
};
