import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { feedbackController } from "../controllers/feedbackController";

export const feedbackRoutes = Router();

feedbackRoutes.use(authMiddleware);
feedbackRoutes.get("/", feedbackController.list);
feedbackRoutes.post("/", feedbackController.submit);
feedbackRoutes.post("/:id/vote", feedbackController.toggleVote);
