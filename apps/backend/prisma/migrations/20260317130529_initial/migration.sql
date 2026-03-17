-- CreateEnum
CREATE TYPE "client_professional_link_status" AS ENUM ('pending', 'active', 'archived', 'blocked');

-- CreateEnum
CREATE TYPE "service_record_status" AS ENUM ('draft', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('link_request', 'link_accepted', 'link_declined', 'shared_inspiration', 'service_record', 'system', 'support', 'other');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'share', 'link', 'unlink', 'status_change');

-- CreateEnum
CREATE TYPE "audit_actor_type" AS ENUM ('user', 'admin', 'system');

-- CreateEnum
CREATE TYPE "support_ticket_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "support_ticket_priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "phone_number" TEXT,
    "setup_status" BOOLEAN DEFAULT false,
    "signup_date" TIMESTAMPTZ,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "display_name" TEXT,
    "business_name" TEXT,
    "business_number" TEXT,
    "about_me" TEXT,
    "social_media" TEXT,
    "booking_site" TEXT,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_professions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_profile_id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "professional_professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_professional_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_user_id" UUID NOT NULL,
    "professional_profile_id" UUID NOT NULL,
    "status" "client_professional_link_status" NOT NULL DEFAULT 'pending',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "status_changed_at" TIMESTAMPTZ,

    CONSTRAINT "client_professional_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profession_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_user_id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "baseline_data" JSONB,
    "last_updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "client_profession_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_user_id" UUID NOT NULL,
    "professional_profile_id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "client_professional_link_id" UUID,
    "service_name" TEXT,
    "summary" TEXT,
    "price" DECIMAL(10,2),
    "duration_minutes" INTEGER,
    "record_status" "service_record_status" NOT NULL DEFAULT 'completed',
    "record_data" JSONB,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_record_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_record_id" UUID NOT NULL,
    "media_type" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_tag" TEXT,
    "sort_order" INTEGER,
    "uploaded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_record_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspirations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "image_url" TEXT,
    "low_res_image_url" TEXT,
    "low_middle_res_url" TEXT,
    "high_middle_res_url" TEXT,

    CONSTRAINT "inspirations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_inspirations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_user_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "inspiration_id" UUID,
    "image_url" TEXT,
    "batch_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_inspirations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" "notification_type",
    "sender_id" UUID,
    "status" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_strikes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "strike_count" INTEGER NOT NULL DEFAULT 0,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "ban_date" TIMESTAMPTZ,
    "banned_by" UUID,
    "last_strike_date" TIMESTAMPTZ,
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "user_strikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reported_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "reported_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT,
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "reported_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_restrictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "restricted_until" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'open',
    "priority" "support_ticket_priority",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_type" "audit_actor_type" NOT NULL DEFAULT 'user',
    "action" "audit_action" NOT NULL,
    "entity_table" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_number_key" ON "profiles"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_profile_id_key" ON "professional_profiles"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "professions_code_key" ON "professions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "professional_professions_professional_profile_id_profession_key" ON "professional_professions"("professional_profile_id", "profession_id");

-- CreateIndex
CREATE INDEX "client_professional_links_client_user_id_idx" ON "client_professional_links"("client_user_id");

-- CreateIndex
CREATE INDEX "client_professional_links_professional_profile_id_idx" ON "client_professional_links"("professional_profile_id");

-- CreateIndex
CREATE INDEX "client_professional_links_status_idx" ON "client_professional_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "client_professional_links_client_user_id_professional_profi_key" ON "client_professional_links"("client_user_id", "professional_profile_id");

-- CreateIndex
CREATE INDEX "client_profession_profiles_client_user_id_idx" ON "client_profession_profiles"("client_user_id");

-- CreateIndex
CREATE INDEX "client_profession_profiles_profession_id_idx" ON "client_profession_profiles"("profession_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_profession_profiles_client_user_id_profession_id_key" ON "client_profession_profiles"("client_user_id", "profession_id");

-- CreateIndex
CREATE INDEX "service_records_client_user_id_idx" ON "service_records"("client_user_id");

-- CreateIndex
CREATE INDEX "service_records_professional_profile_id_idx" ON "service_records"("professional_profile_id");

-- CreateIndex
CREATE INDEX "service_records_profession_id_idx" ON "service_records"("profession_id");

-- CreateIndex
CREATE INDEX "service_records_created_at_idx" ON "service_records"("created_at");

-- CreateIndex
CREATE INDEX "service_record_media_service_record_id_idx" ON "service_record_media"("service_record_id");

-- CreateIndex
CREATE INDEX "inspirations_owner_id_idx" ON "inspirations"("owner_id");

-- CreateIndex
CREATE INDEX "inspirations_profession_id_idx" ON "inspirations"("profession_id");

-- CreateIndex
CREATE INDEX "shared_inspirations_sender_user_id_idx" ON "shared_inspirations"("sender_user_id");

-- CreateIndex
CREATE INDEX "shared_inspirations_recipient_user_id_idx" ON "shared_inspirations"("recipient_user_id");

-- CreateIndex
CREATE INDEX "shared_inspirations_batch_id_idx" ON "shared_inspirations"("batch_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "blocked_users_blocker_id_idx" ON "blocked_users"("blocker_id");

-- CreateIndex
CREATE INDEX "blocked_users_blocked_id_idx" ON "blocked_users"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_blocker_id_blocked_id_key" ON "blocked_users"("blocker_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_strikes_user_id_key" ON "user_strikes"("user_id");

-- CreateIndex
CREATE INDEX "reported_users_reporter_id_idx" ON "reported_users"("reporter_id");

-- CreateIndex
CREATE INDEX "reported_users_reported_id_idx" ON "reported_users"("reported_id");

-- CreateIndex
CREATE INDEX "reported_users_status_idx" ON "reported_users"("status");

-- CreateIndex
CREATE INDEX "user_restrictions_user_id_idx" ON "user_restrictions"("user_id");

-- CreateIndex
CREATE INDEX "admin_actions_admin_id_idx" ON "admin_actions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_actions_target_user_id_idx" ON "admin_actions"("target_user_id");

-- CreateIndex
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_device_id_key" ON "push_tokens"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_table_entity_id_idx" ON "audit_logs"("entity_table", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_event_type_idx" ON "activity_logs"("event_type");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_professions" ADD CONSTRAINT "professional_professions_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_professions" ADD CONSTRAINT "professional_professions_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_professional_links" ADD CONSTRAINT "client_professional_links_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_professional_links" ADD CONSTRAINT "client_professional_links_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_professional_links" ADD CONSTRAINT "client_professional_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profession_profiles" ADD CONSTRAINT "client_profession_profiles_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profession_profiles" ADD CONSTRAINT "client_profession_profiles_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profession_profiles" ADD CONSTRAINT "client_profession_profiles_last_updated_by_user_id_fkey" FOREIGN KEY ("last_updated_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_client_professional_link_id_fkey" FOREIGN KEY ("client_professional_link_id") REFERENCES "client_professional_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_media" ADD CONSTRAINT "service_record_media_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_record_media" ADD CONSTRAINT "service_record_media_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspirations" ADD CONSTRAINT "inspirations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspirations" ADD CONSTRAINT "inspirations_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_inspirations" ADD CONSTRAINT "shared_inspirations_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_inspirations" ADD CONSTRAINT "shared_inspirations_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_inspirations" ADD CONSTRAINT "shared_inspirations_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_inspirations" ADD CONSTRAINT "shared_inspirations_inspiration_id_fkey" FOREIGN KEY ("inspiration_id") REFERENCES "inspirations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reported_users" ADD CONSTRAINT "reported_users_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reported_users" ADD CONSTRAINT "reported_users_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
