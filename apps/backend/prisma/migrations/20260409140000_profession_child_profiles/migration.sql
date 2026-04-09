-- Profession-specific child tables (hair today, nails placeholder; not on generic professional_professions).

CREATE TABLE "professional_hair_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_profile_id" UUID NOT NULL,
    "color_brand" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "professional_hair_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_nails_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "professional_nails_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_hair_profiles_professional_profile_id_key" ON "professional_hair_profiles"("professional_profile_id");

CREATE UNIQUE INDEX "professional_nails_profiles_professional_profile_id_key" ON "professional_nails_profiles"("professional_profile_id");

ALTER TABLE "professional_hair_profiles" ADD CONSTRAINT "professional_hair_profiles_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "professional_nails_profiles" ADD CONSTRAINT "professional_nails_profiles_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
