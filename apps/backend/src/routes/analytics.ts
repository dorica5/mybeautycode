import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { analyticsController } from "../controllers/analyticsController";

export const analyticsRoutes = Router();

analyticsRoutes.post("/events", authMiddleware, analyticsController.recordEvent);
