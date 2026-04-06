import { Request, Response } from "express";
import { relationshipService } from "../services/relationshipService";
import { professionService } from "../services/professionService";
import { isUuid } from "../lib/isUuid";

export const relationshipController = {
  /** Professional asks to link with a client (pending row + notification). */
  async requestClient(req: Request, res: Response) {
    const client_id = req.body.client_id as string | undefined;
    const userId = req.userId!;
    if (!client_id) {
      return res.status(400).json({ error: "client_id required" });
    }
    if (!isUuid(client_id)) {
      return res.status(400).json({ error: "Invalid client_id" });
    }
    try {
      const result = await relationshipService.requestClientLink(userId, client_id);
      res.json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400 || e.statusCode === 403 || e.statusCode === 409) {
        return res.status(e.statusCode).json({ error: e.message });
      }
      console.error("relationship requestClient error:", err);
      res.status(500).json({ error: "Failed to send request" });
    }
  },

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
      const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
        hairdresserId
      );
      await relationshipService.remove(professionalProfileId, clientId);
      res.json({ success: true });
    } catch (err) {
      console.error("relationship remove error:", err);
      res.status(500).json({ error: "Failed to remove relationship" });
    }
  },

  async checkExists(req: Request, res: Response) {
    const hairdresserId = req.query.hairdresser_id as string;
    const clientId = (req.query.client_id as string) ?? req.userId;
    const userId = req.userId!;

    if (req.query.link_ui === "1") {
      if (!hairdresserId || !clientId) {
        return res
          .status(400)
          .json({ error: "hairdresser_id and client_id required" });
      }
      if (!isUuid(hairdresserId) || !isUuid(clientId)) {
        return res.status(400).json({ error: "Invalid hairdresser_id or client_id" });
      }
      if (userId !== hairdresserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      try {
        const status = await relationshipService.getClientLinkUiState(
          hairdresserId,
          clientId
        );
        return res.json({
          status,
          exists: status === "active",
        });
      } catch (err) {
        console.error("relationship checkExists link_ui error:", err);
        return res.status(500).json({ error: "Failed to fetch link status" });
      }
    }

    if (!hairdresserId || !clientId) {
      return res.status(400).json({ error: "hairdresser_id and client_id required" });
    }
    if (!isUuid(hairdresserId) || !isUuid(clientId)) {
      return res.status(400).json({ error: "Invalid hairdresser_id or client_id" });
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
    const hairdresserId = (req.query.hairdresser_id as string) ?? req.userId;
    if (!hairdresserId) {
      return res.status(400).json({ error: "hairdresser_id or auth required" });
    }
    try {
      const professionalProfileId = await professionService.getOrCreateProfessionalProfileId(
        String(hairdresserId)
      );
      const data = await relationshipService.listByProfessional(professionalProfileId);
      res.json(data);
    } catch (err) {
      console.error("relationship listByHairdresser error:", err);
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  },

  async listByClient(req: Request, res: Response) {
    const clientId = (req.query.client_id as string) ?? req.userId;
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
