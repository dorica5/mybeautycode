-- Optional screenshots on feedback submissions (storage paths in feedback_screenshots bucket).

ALTER TABLE "feedback_items" ADD COLUMN IF NOT EXISTS "screenshot_paths" JSONB NOT NULL DEFAULT '[]'::jsonb;
