-- Bucket for in-app feedback screenshot attachments (private; signed URLs via API).

INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback_screenshots', 'feedback_screenshots', false)
ON CONFLICT (id) DO UPDATE
SET public = false;
