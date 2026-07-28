import { Router } from "express";
import { adminAuthMiddleware } from "../middleware/adminAuth";
import { adminController } from "../controllers/adminController";

export const adminRoutes = Router();

adminRoutes.get("/status", adminController.status);
adminRoutes.get("/metrics", adminAuthMiddleware, adminController.getMetrics);
