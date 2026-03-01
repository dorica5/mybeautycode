import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { haircodeController } from "../controllers/haircodeController";

export const haircodeRoutes = Router();

haircodeRoutes.use(authMiddleware);

haircodeRoutes.get("/latest", haircodeController.listLatestHaircodes);
haircodeRoutes.get("/client-gallery", haircodeController.listClientGallery);
haircodeRoutes.get("/", haircodeController.listClientHaircodes);
haircodeRoutes.get("/:id/media", haircodeController.getMedia);
haircodeRoutes.get("/:id", haircodeController.getWithMedia);
haircodeRoutes.post("/", haircodeController.create);
haircodeRoutes.put("/:id", haircodeController.update);
haircodeRoutes.delete("/:id/hairdresser", haircodeController.deleteHairdresser);
haircodeRoutes.delete("/:id/client", haircodeController.deleteClient);
haircodeRoutes.post("/media", haircodeController.insertMedia);
haircodeRoutes.delete("/:haircodeId/media", haircodeController.deleteMediaItems);
