import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { notificationController } from "../controllers/notificationController";

export const notificationRoutes = Router();

notificationRoutes.use(authMiddleware);

notificationRoutes.post("/send", notificationController.send);
notificationRoutes.post("/push-token", notificationController.savePushToken);
notificationRoutes.get("/", notificationController.list);
notificationRoutes.get("/friend-request-status", notificationController.getFriendRequestStatus);
notificationRoutes.get("/:id", notificationController.getById);
notificationRoutes.put("/:id/read", notificationController.markAsRead);
notificationRoutes.put("/:id/respond-friend-request", notificationController.respondToFriendRequest);
