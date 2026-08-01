import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { placesController } from "../controllers/placesController";

export const placesRoutes = Router();

placesRoutes.use(authMiddleware);
placesRoutes.get("/autocomplete", placesController.autocomplete);
placesRoutes.get("/details", placesController.details);
placesRoutes.get("/geocode", placesController.geocode);
