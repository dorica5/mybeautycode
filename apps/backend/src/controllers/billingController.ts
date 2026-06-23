import { Request, Response } from "express";
import { billingService } from "../services/billingService";

export const billingController = {
  async getStatus(req: Request, res: Response) {
    try {
      const status = await billingService.getProBillingStatus(req.userId!);
      res.json(status);
    } catch (err) {
      console.error("billing getStatus error:", err);
      res.status(500).json({ error: "Failed to fetch billing status" });
    }
  },

  async syncEntitlement(req: Request, res: Response) {
    const body = req.body as {
      entitlementActive?: boolean;
      entitlementExpiresAt?: string | null;
      plan?: string | null;
      revenueCatAppUserId?: string | null;
    };
    try {
      const isPro = await billingService.isProfessional(req.userId!);
      if (!isPro) {
        return res.status(403).json({ error: "Professional account required" });
      }
      const status = await billingService.syncEntitlementFromClient(
        req.userId!,
        {
          entitlementActive: body.entitlementActive === true,
          entitlementExpiresAt: body.entitlementExpiresAt ?? null,
          plan: body.plan ?? null,
          revenueCatAppUserId: body.revenueCatAppUserId ?? req.userId!,
        }
      );
      res.json(status);
    } catch (err) {
      console.error("billing syncEntitlement error:", err);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  },

  async revenueCatWebhook(req: Request, res: Response) {
    try {
      const result = await billingService.handleRevenueCatWebhook(req.body);
      res.json(result);
    } catch (err) {
      console.error("billing revenueCatWebhook error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  },
};
