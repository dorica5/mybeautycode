-- In-app feedback board: ideas, votes, and status tracking.

CREATE TYPE "feedback_item_type" AS ENUM ('feature', 'improvement', 'bug', 'other');
CREATE TYPE "feedback_item_status" AS ENUM ('reviewing', 'planned', 'in_development', 'shipped', 'declined');

CREATE TABLE "feedback_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "feedback_item_type" NOT NULL DEFAULT 'feature',
    "status" "feedback_item_status" NOT NULL DEFAULT 'reviewing',
    "submitter_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedback_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_votes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_items_status_idx" ON "feedback_items"("status");
CREATE INDEX "feedback_items_created_at_idx" ON "feedback_items"("created_at");
CREATE INDEX "feedback_votes_user_id_idx" ON "feedback_votes"("user_id");

CREATE UNIQUE INDEX "feedback_votes_feedback_item_id_user_id_key" ON "feedback_votes"("feedback_item_id", "user_id");

ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_feedback_item_id_fkey" FOREIGN KEY ("feedback_item_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
