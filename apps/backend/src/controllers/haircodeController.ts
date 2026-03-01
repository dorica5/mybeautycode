import { Request, Response } from "express";
import { haircodeService } from "../services/haircodeService";

export const haircodeController = {
  async listClientGallery(req: Request, res: Response) {
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "clientId required" });
    }
    try {
      const data = await haircodeService.listClientGallery(String(clientId));
      res.json(data);
    } catch (err) {
      console.error("haircode listClientGallery error:", err);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  },

  async listClientHaircodes(req: Request, res: Response) {
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "clientId required" });
    }
    try {
      const data = await haircodeService.listClientHaircodes(String(clientId));
      res.json(data);
    } catch (err) {
      console.error("haircode listClientHaircodes error:", err);
      res.status(500).json({ error: "Failed to fetch haircodes" });
    }
  },

  async listLatestHaircodes(req: Request, res: Response) {
    const hairdresserId = req.userId!;
    try {
      const data = await haircodeService.listLatestHaircodes(hairdresserId);
      res.json(data);
    } catch (err) {
      console.error("haircode listLatestHaircodes error:", err);
      res.status(500).json({ error: "Failed to fetch haircodes" });
    }
  },

  async getWithMedia(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const data = await haircodeService.getWithMedia(id);
      if (!data) return res.status(404).json({ error: "Haircode not found" });
      res.json(data);
    } catch (err) {
      console.error("haircode getWithMedia error:", err);
      res.status(500).json({ error: "Failed to fetch haircode" });
    }
  },

  async getMedia(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const data = await haircodeService.getMedia(id);
      res.json(data);
    } catch (err) {
      console.error("haircode getMedia error:", err);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  },

  async create(req: Request, res: Response) {
    const userId = req.userId!;
    const body = req.body;
    try {
      const data = await haircodeService.create({
        client_id: body.client_id,
        hairdresser_id: userId,
        hairdresser_name: body.hairdresser_name,
        service_description: body.service_description,
        services: body.services,
        price: body.price,
        duration: body.duration,
      });
      res.json(data);
    } catch (err) {
      console.error("haircode create error:", err);
      res.status(500).json({ error: "Failed to create haircode" });
    }
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const data = await haircodeService.update(id, req.body);
      res.json(data);
    } catch (err) {
      console.error("haircode update error:", err);
      res.status(500).json({ error: "Failed to update haircode" });
    }
  },

  async deleteHairdresser(req: Request, res: Response) {
    const { id } = req.params;
    const hairdresserId = req.userId!;
    try {
      await haircodeService.deleteHairdresser(id, hairdresserId);
      res.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      res.status(400).json({ error: msg });
    }
  },

  async deleteClient(req: Request, res: Response) {
    const { id } = req.params;
    const hairdresserId = req.userId!;
    try {
      await haircodeService.deleteClient(id, hairdresserId);
      res.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      res.status(400).json({ error: msg });
    }
  },

  async insertMedia(req: Request, res: Response) {
    const body = req.body as {
      records?: { haircode_id: string; media_url: string; media_type: string }[];
    };
    const records = body.records ?? [];
    try {
      await haircodeService.insertMedia(records);
      res.json({ success: true });
    } catch (err) {
      console.error("haircode insertMedia error:", err);
      res.status(500).json({ error: "Failed to insert media" });
    }
  },

  async deleteMediaItems(req: Request, res: Response) {
    const { haircodeId } = req.params;
    const { mediaUrls } = req.body as { mediaUrls: string[] };
    try {
      await haircodeService.deleteMediaItems(haircodeId, mediaUrls);
      res.json({ success: true });
    } catch (err) {
      console.error("haircode deleteMediaItems error:", err);
      res.status(500).json({ error: "Failed to delete media" });
    }
  },
};
