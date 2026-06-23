import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { billingController } from "../controllers/billingController";

export const billingRoutes = Router();

billingRoutes.get("/status", authMiddleware, billingController.getStatus);
billingRoutes.post(
  "/sync-entitlement",
  authMiddleware,
  billingController.syncEntitlement
);
/** Public endpoint — add signature verification when RevenueCat is configured. */
billingRoutes.post(
  "/webhooks/revenuecat",
  billingController.revenueCatWebhook
);
