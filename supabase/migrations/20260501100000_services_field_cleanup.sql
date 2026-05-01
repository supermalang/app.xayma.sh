-- Aligns xayma_app.services with what CreateService actually persists.
-- - Adds `versions` (jsonb array of supported version tags collected from the form).
-- - Drops `controlNodeId` and `dockerimage`, which nothing in the app reads or writes.

ALTER TABLE xayma_app.services
  DROP CONSTRAINT IF EXISTS "services_controlNodeId_fkey",
  ADD COLUMN IF NOT EXISTS versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  DROP COLUMN IF EXISTS "controlNodeId",
  DROP COLUMN IF EXISTS dockerimage;
