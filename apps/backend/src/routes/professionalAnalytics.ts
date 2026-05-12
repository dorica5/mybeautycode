import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { professionalAnalyticsController } from "../controllers/professionalAnalyticsController";

export const professionalAnalyticsRoutes = Router();

professionalAnalyticsRoutes.use(authMiddleware);
professionalAnalyticsRoutes.post(
  "/events",
  professionalAnalyticsController.recordEvent
);
professionalAnalyticsRoutes.get("/me", professionalAnalyticsController.me);
