import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { userController } from "../controllers/userController";

export const userRoutes = Router();

userRoutes.use(authMiddleware);
userRoutes.delete(
  "/me/professional-lane",
  userController.deleteProfessionalLane
);
userRoutes.delete("/:id", userController.delete);
