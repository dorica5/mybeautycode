import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { authController } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/forgot-password", authController.forgotPassword);
authRoutes.get("/me", authMiddleware, authController.me);
authRoutes.get("/status", authMiddleware, authController.status);
