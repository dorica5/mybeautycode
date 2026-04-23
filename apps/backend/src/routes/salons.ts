import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { salonController } from "../controllers/salonController";

export const salonRoutes = Router();

salonRoutes.use(authMiddleware);
salonRoutes.get("/nearby", salonController.nearby);
salonRoutes.get("/:id/professionals", salonController.professionalsAtSalon);
