-- Remove client personal bio from profiles (hairdresser bios stay on professional_profiles.about_me).
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "about_me";
