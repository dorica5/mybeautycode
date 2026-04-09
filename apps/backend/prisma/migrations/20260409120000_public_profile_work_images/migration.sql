-- CreateTable
CREATE TABLE "public_profile_work_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "profession_code" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "low_res_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_profile_work_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_profile_work_images_owner_id_profession_code_idx" ON "public_profile_work_images"("owner_id", "profession_code");

-- AddForeignKey
ALTER TABLE "public_profile_work_images" ADD CONSTRAINT "public_profile_work_images_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
