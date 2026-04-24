-- Salons: canonical place (by Google place_id) grouping all pros who list it as their business address.
CREATE TABLE "salons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "google_place_id" TEXT NOT NULL,
  "name" TEXT,
  "formatted_address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6),
  CONSTRAINT "salons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salons_google_place_id_key" ON "salons" ("google_place_id");
CREATE INDEX "salons_latitude_longitude_idx" ON "salons" ("latitude", "longitude");

-- Link per-profession row to the canonical salon. Nullable: legacy free-text addresses stay usable.
ALTER TABLE "professional_professions" ADD COLUMN "salon_id" UUID;

ALTER TABLE "professional_professions"
  ADD CONSTRAINT "professional_professions_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "salons" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "professional_professions_salon_id_idx" ON "professional_professions" ("salon_id");
