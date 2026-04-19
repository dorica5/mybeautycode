import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { profileController } from "../controllers/profileController";

export const profileRoutes = Router();

profileRoutes.use(authMiddleware);
profileRoutes.get("/search/clients", profileController.searchClients);
profileRoutes.get("/search/clients-with-relationship", profileController.searchClientsWithRelationship);
profileRoutes.get("/search/hairdressers-with-relationship", profileController.searchHairdressersWithRelationship);
/** Must be before `/:id/public-work-images` so `me` is not captured as a profile id. */
profileRoutes.get("/me/public-work-images", profileController.listMyPublicWorkImages);
profileRoutes.post("/me/public-work-images", profileController.addMyPublicWorkImage);
profileRoutes.delete(
  "/me/public-work-images/:imageId",
  profileController.deleteMyPublicWorkImage
);
profileRoutes.get("/:id/public-work-images", profileController.listPublicWorkImages);
profileRoutes.post("/:id/public-work-images", profileController.addPublicWorkImage);
profileRoutes.delete(
  "/:id/public-work-images/:imageId",
  profileController.deletePublicWorkImage
);
profileRoutes.get("/:id", profileController.getById);
profileRoutes.put("/:id", profileController.update);
