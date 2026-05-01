-- Add logo_url to services so the deployment wizard can render a service brand mark
-- with a placeholder fallback when missing.

ALTER TABLE xayma_app.services
  ADD COLUMN IF NOT EXISTS logo_url text;
