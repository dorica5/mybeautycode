-- Client personal bio on profiles (professionals keep lane-specific bios on professional_professions).
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "about_me" TEXT;
