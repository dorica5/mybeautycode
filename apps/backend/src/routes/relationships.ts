import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { relationshipController } from "../controllers/relationshipController";

export const relationshipRoutes = Router();

relationshipRoutes.use(authMiddleware);

relationshipRoutes.post("/request-client", relationshipController.requestClient);
relationshipRoutes.post("/", relationshipController.add);
relationshipRoutes.delete("/", relationshipController.remove);
relationshipRoutes.get("/check", relationshipController.checkExists);
relationshipRoutes.get("/hairdresser", relationshipController.listByHairdresser);
relationshipRoutes.get("/", relationshipController.listByClient);
