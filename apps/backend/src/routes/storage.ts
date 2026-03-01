import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { storageController } from "../controllers/storageController";

export const storageRoutes = Router();

storageRoutes.use(authMiddleware);
storageRoutes.post(
  "/upload",
  storageController.uploadMiddleware,
  storageController.upload
);
