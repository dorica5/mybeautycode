-- Unique username on profiles (multiple NULLs allowed in PostgreSQL).

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "username" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_key" ON "profiles"("username");
