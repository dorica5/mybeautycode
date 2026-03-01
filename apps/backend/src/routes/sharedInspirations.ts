import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { sharedInspirationController } from "../controllers/sharedInspirationController";

export const sharedInspirationRoutes = Router();

sharedInspirationRoutes.use(authMiddleware);
sharedInspirationRoutes.get("/", sharedInspirationController.listByBatch);
sharedInspirationRoutes.post("/", sharedInspirationController.create);
sharedInspirationRoutes.post("/accept", sharedInspirationController.accept);
sharedInspirationRoutes.delete("/", sharedInspirationController.reject);
