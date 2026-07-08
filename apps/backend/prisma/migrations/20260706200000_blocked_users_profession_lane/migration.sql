-- Per-lane blocks: client blocking "hair" must not hide the same person on nails/brows.
ALTER TABLE "blocked_users" DROP CONSTRAINT IF EXISTS "blocked_users_blocker_id_blocked_id_key";

ALTER TABLE "blocked_users"
ADD COLUMN IF NOT EXISTS "profession_code" TEXT NOT NULL DEFAULT 'hair';

ALTER TABLE "blocked_users" ALTER COLUMN "profession_code" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_blocker_blocked_lane_key"
ON "blocked_users" ("blocker_id", "blocked_id", "profession_code");

CREATE INDEX IF NOT EXISTS "blocked_users_profession_code_idx"
ON "blocked_users" ("profession_code");
