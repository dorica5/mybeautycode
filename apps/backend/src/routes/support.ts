import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { supportController } from "../controllers/supportController";

export const supportRoutes = Router();

supportRoutes.use(authMiddleware);
supportRoutes.post("/", supportController.create);
