import { Request, Response } from "express";
import { visitService } from "../services/visitService";
import { serviceRecordAccessService } from "../services/serviceRecordAccessService";
import { billingService, VISIT_LIMIT_ERROR_CODE } from "../services/billingService";
import { readProfessionCodeQuery } from "../lib/readProfessionCodeQuery";
import { viewerMaySeeServiceRecordPrice } from "../lib/visitPriceVisibility";

function sendVisitLimitResponse(res: Response, err: unknown) {
  const e = err as {
    statusCode?: number;
    code?: string;
    message?: string;
    billing?: Record<string, unknown>;
  };
  if (e.statusCode === 402 && e.code === VISIT_LIMIT_ERROR_CODE) {
    return res.status(402).json({
      error: e.message ?? "Visit limit reached",
      code: VISIT_LIMIT_ERROR_CODE,
      billing: e.billing,
    });
  }
  return null;
}

export const visitController = {
  async listClientGallery(req: Request, res: Response) {
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "clientId required" });
    }
    try {
      const professionCode = readProfessionCodeQuery(req.query);
      const clientIdStr = String(clientId);
      if (req.userId !== clientIdStr) {
        await billingService.assertProCanViewVisits(req.userId!);
      }
      await serviceRecordAccessService.assertCanAccessClientTimeline(
        req.userId!,
        clientIdStr,
        { professionCode }
      );
      const data = await visitService.listClientGallery(
        req.userId!,
        clientIdStr,
        professionCode
      );
      res.json(data);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
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
      const professionCode = readProfessionCodeQuery(req.query);
      const clientIdStr = String(clientId);
      if (req.userId !== clientIdStr) {
        await billingService.assertProCanViewVisits(req.userId!);
      }
      await serviceRecordAccessService.assertCanAccessClientTimeline(
        req.userId!,
        clientIdStr,
        { professionCode }
      );
      const data = await visitService.listClientHaircodes(
        req.userId!,
        clientIdStr,
        professionCode
      );
      res.json(data);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      console.error("haircode listClientHaircodes error:", err);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  },

  async listLatestHaircodes(req: Request, res: Response) {
    const hairdresserId = req.userId!;
    try {
      await billingService.assertProCanViewVisits(hairdresserId);
      const professionCode = readProfessionCodeQuery(req.query);
      const data = await visitService.listLatestHaircodes(
        hairdresserId,
        professionCode
      );
      res.json(data);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      console.error("haircode listLatestHaircodes error:", err);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  },

  async getWithMedia(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const record = await visitService.getWithMedia(id);
      if (!record) return res.status(404).json({ error: "Visit not found" });
      const clientUserId =
        typeof (record as { clientUserId?: string }).clientUserId === "string"
          ? (record as { clientUserId: string }).clientUserId
          : null;
      if (clientUserId && clientUserId !== req.userId) {
        await billingService.assertProCanViewVisits(req.userId!);
      }
      await serviceRecordAccessService.assertCanAccessServiceRecord(req.userId!, id);
      const { clientPrivateNote, ...rest } = record as Record<string, unknown> & {
        clientPrivateNote?: string | null;
        clientUserId?: string;
        professionId?: string;
        price?: unknown;
      };
      const isClientViewer = rest.clientUserId === req.userId;
      const professionCode = readProfessionCodeQuery(req.query);
      const visitProfessionId =
        typeof rest.professionId === "string" ? rest.professionId : "";
      const maySeePrice =
        !isClientViewer &&
        visitProfessionId &&
        (await viewerMaySeeServiceRecordPrice(
          req.userId!,
          visitProfessionId,
          professionCode
        ));
      const payload: Record<string, unknown> = isClientViewer
        ? {
            ...rest,
            client_private_note: clientPrivateNote ?? null,
          }
        : { ...rest };
      if (!maySeePrice) {
        payload.price = null;
      }
      res.json(payload);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      if (e.statusCode === 404) {
        return res.status(404).json({ error: e.message ?? "Not found" });
      }
      console.error("haircode getWithMedia error:", err);
      res.status(500).json({ error: "Failed to fetch visit" });
    }
  },

  async getMedia(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const peek = await visitService.getWithMedia(id);
      if (!peek) return res.status(404).json({ error: "Visit not found" });
      const clientUserId =
        typeof (peek as { clientUserId?: string }).clientUserId === "string"
          ? (peek as { clientUserId: string }).clientUserId
          : null;
      if (clientUserId && clientUserId !== req.userId) {
        await billingService.assertProCanViewVisits(req.userId!);
      }
      await serviceRecordAccessService.assertCanAccessServiceRecord(req.userId!, id);
      const data = await visitService.getMedia(id);
      res.json(data);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      if (e.statusCode === 404) {
        return res.status(404).json({ error: e.message ?? "Not found" });
      }
      console.error("haircode getMedia error:", err);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  },

  async create(req: Request, res: Response) {
    const userId = req.userId!;
    const body = req.body;
    try {
      await billingService.assertProCanCreateVisit(userId);
      const data = await visitService.create({
        client_id: body.client_id,
        hairdresser_id: userId,
        hairdresser_name: body.hairdresser_name,
        service_description: body.service_description,
        services: body.services,
        price: body.price,
        duration: body.duration,
        profession_code:
          typeof body.profession_code === "string"
            ? body.profession_code
            : typeof body.professionCode === "string"
              ? body.professionCode
              : undefined,
      });
      res.json(data);
    } catch (err: unknown) {
      const limited = sendVisitLimitResponse(res, err);
      if (limited !== null) return limited;
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message ?? "Bad request" });
      }
      console.error("haircode create error:", err);
      res.status(500).json({ error: "Failed to create visit" });
    }
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const noteKeyPresent = Object.prototype.hasOwnProperty.call(
      body,
      "client_private_note"
    );

    try {
      if (noteKeyPresent) {
        const hasProBodyField =
          body.service_description != null ||
          body.services != null ||
          body.price != null ||
          body.duration != null;
        const noteRaw = body.client_private_note;
        const note =
          typeof noteRaw === "string"
            ? noteRaw
            : noteRaw == null
              ? ""
              : String(noteRaw);

        if (hasProBodyField) {
          return res.status(400).json({
            error:
              "Cannot update personal note together with visit details. Save them separately.",
          });
        }

        await serviceRecordAccessService.assertClientOwnsVisit(req.userId!, id);
        const data = await visitService.updateClientPrivateNote(
          id,
          req.userId!,
          note
        );
        return res.json(data);
      }

      await serviceRecordAccessService.assertProfessionalOwnsVisit(req.userId!, id);
      await billingService.assertProCanViewVisits(req.userId!);
      const data = await visitService.update(id, req.body);
      res.json(data);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 400) {
        return res.status(400).json({ error: e.message ?? "Bad request" });
      }
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      console.error("haircode update error:", err);
      res.status(500).json({ error: "Failed to update visit" });
    }
  },

  async deleteHairdresser(req: Request, res: Response) {
    const { id } = req.params;
    const viewerProfileId = req.userId!;
    try {
      await visitService.deleteByProfessional(id, viewerProfileId);
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      const status = e.statusCode ?? 400;
      res.status(status).json({ error: e.message ?? "Failed to delete" });
    }
  },

  async deleteClient(req: Request, res: Response) {
    const { id } = req.params;
    const clientUserId = req.userId!;
    try {
      await visitService.deleteByClient(id, clientUserId);
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      const status = e.statusCode ?? 400;
      res.status(status).json({ error: e.message ?? "Failed to delete" });
    }
  },

  async insertMedia(req: Request, res: Response) {
    const body = req.body as {
      records?: { haircode_id: string; service_record_id?: string; media_url: string; media_type: string }[];
    };
    const records = (body.records ?? [])
      .filter((r) => r.haircode_id || r.service_record_id)
      .map((r) => ({
        haircode_id: r.haircode_id ?? r.service_record_id!,
        media_url: r.media_url,
        media_type: r.media_type,
      }));
    try {
      const ids = [...new Set(records.map((r) => r.haircode_id))];
      for (const sid of ids) {
        await serviceRecordAccessService.assertProfessionalOwnsVisit(
          req.userId!,
          sid
        );
      }
      await billingService.assertProCanViewVisits(req.userId!);
      await visitService.insertMedia(records);
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      console.error("haircode insertMedia error:", err);
      res.status(500).json({ error: "Failed to insert media" });
    }
  },

  async deleteMediaItems(req: Request, res: Response) {
    const { visitId } = req.params;
    const { mediaUrls } = req.body as { mediaUrls: string[] };
    try {
      await serviceRecordAccessService.assertProfessionalOwnsVisit(
        req.userId!,
        visitId
      );
      await visitService.deleteMediaItems(visitId, mediaUrls);
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 403) {
        return res.status(403).json({ error: e.message ?? "Forbidden" });
      }
      console.error("haircode deleteMediaItems error:", err);
      res.status(500).json({ error: "Failed to delete media" });
    }
  },
};
