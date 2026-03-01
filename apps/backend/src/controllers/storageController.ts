import { Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { storageService } from "../services/storageService";

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
      const url = await storageService.upload(
        bucket,
        path,
        file.buffer,
        file.mimetype
      );
      res.json({ url, path });
    } catch (err) {
      console.error("storage upload error:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  },
};
