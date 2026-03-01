import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { moderationController } from "../controllers/moderationController";

export const moderationRoutes = Router();

moderationRoutes.use(authMiddleware);

moderationRoutes.post("/block", moderationController.block);
moderationRoutes.post("/unblock", moderationController.unblock);
moderationRoutes.get("/blocked-ids", moderationController.getBlockedIds);
moderationRoutes.get("/blocked-ids", moderationController.getBlockedIds);
moderationRoutes.get("/blocker-ids", moderationController.getAllBlockerIds);
moderationRoutes.get("/status", moderationController.getUserStatus);
moderationRoutes.post("/report", moderationController.report);
