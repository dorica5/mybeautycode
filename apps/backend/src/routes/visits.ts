import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { visitController } from "../controllers/visitController";

export const visitRoutes = Router();

visitRoutes.use(authMiddleware);

visitRoutes.get("/latest", visitController.listLatestHaircodes);
visitRoutes.get("/client-gallery", visitController.listClientGallery);
visitRoutes.get("/", visitController.listClientHaircodes);
visitRoutes.get("/:id/media", visitController.getMedia);
visitRoutes.get("/:id", visitController.getWithMedia);
visitRoutes.post("/", visitController.create);
visitRoutes.put("/:id", visitController.update);
visitRoutes.delete("/:id/professional", visitController.deleteHairdresser);
visitRoutes.delete("/:id/client", visitController.deleteClient);
visitRoutes.post("/media", visitController.insertMedia);
visitRoutes.delete("/:visitId/media", visitController.deleteMediaItems);
