import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { inspirationController } from "../controllers/inspirationController";

export const inspirationRoutes = Router();

inspirationRoutes.use(authMiddleware);

inspirationRoutes.get("/", inspirationController.listByOwner);
inspirationRoutes.post("/", inspirationController.create);
inspirationRoutes.delete("/", inspirationController.deleteByImageUrls);
