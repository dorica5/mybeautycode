-- Professional subscription / visit billing (RevenueCat sync target)
CREATE TABLE "professional_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "revenuecat_app_user_id" TEXT,
    "entitlement_active" BOOLEAN NOT NULL DEFAULT false,
    "entitlement_expires_at" TIMESTAMPTZ(6),
    "plan" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "professional_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_subscriptions_profile_id_key" ON "professional_subscriptions"("profile_id");

ALTER TABLE "professional_subscriptions" ADD CONSTRAINT "professional_subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
