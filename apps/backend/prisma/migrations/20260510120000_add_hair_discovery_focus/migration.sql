-- CreateEnum
CREATE TYPE "HairDiscoveryFocus" AS ENUM ('barber', 'bride');

-- AlterTable
ALTER TABLE "professional_professions" ADD COLUMN "hair_discovery_focus" "HairDiscoveryFocus";
