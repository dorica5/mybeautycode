import { Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { storageService } from "../services/storageService";
import { serviceRecordAccessService } from "../services/serviceRecordAccessService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const storageController = {
  uploadMiddleware: upload.single("file"),

  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const bucket = (req.body.bucket as string) ?? "inspirations";
    const ext = file.originalname.split(".").pop() ?? "jpg";
    const path = `${req.userId}/${randomUUID()}.${ext}`;
    try {
      const { path: storagePath } = await storageService.upload(
        bucket,
        path,
        file.buffer,
        file.mimetype
      );
      res.json({ path: storagePath });
    } catch (err) {
      console.error("storage upload error:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  },

  async signedUrl(req: Request, res: Response) {
    const bucket = String(req.query.bucket ?? "");
    const path = String(req.query.path ?? "");
    const userId = req.userId;
    try {
      if (bucket === "haircode_images" && userId) {
        const safe = path.trim();
        if (
          !safe ||
          safe.length > 2048 ||
          safe.includes("..") ||
          safe.startsWith("/")
        ) {
          return res.status(400).json({ error: "Invalid storage path." });
        }
        await serviceRecordAccessService.assertCanReadHaircodeImage(userId, safe);
      }
      const signedUrl = await storageService.createSignedUrl(bucket, path);
      res.json({ signedUrl });
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 400 || e.statusCode === 403) {
        return res.status(e.statusCode).json({ error: e.message });
      }
      console.error("signed url error:", err);
      res.status(500).json({ error: "Failed to sign URL" });
    }
  },

  async signBatch(req: Request, res: Response) {
    const items = req.body?.items as { bucket?: string; path?: string }[] | undefined;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items[] required" });
    }
    if (items.length > 60) {
      return res.status(400).json({ error: "Too many items (max 60)" });
    }
    const userId = req.userId;
    try {
      const urls = await Promise.all(
        items.map(async (item) => {
          const bucket = String(item.bucket ?? "");
          const path = String(item.path ?? "");
          if (!bucket || !path) return null;
          try {
            if (bucket === "haircode_images" && userId) {
              const safe = path.trim();
              if (
                !safe ||
                safe.length > 2048 ||
                safe.includes("..") ||
                safe.startsWith("/")
              ) {
                return null;
              }
              await serviceRecordAccessService.assertCanReadHaircodeImage(
                userId,
                safe
              );
            }
            return await storageService.createSignedUrl(bucket, path);
          } catch {
            return null;
          }
        })
      );
      res.json({ urls });
    } catch (err) {
      console.error("signBatch error:", err);
      res.status(500).json({ error: "Failed to sign URLs" });
    }
  },
};
