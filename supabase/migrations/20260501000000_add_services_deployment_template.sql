-- Stores the deployment-engine job template selected when the service is created.
-- Shape: { id: number, url: string, name: string } — id+url are needed to launch
-- a job against the deployment engine; name is kept for UI display without a
-- second round-trip. Nullable until a template is chosen.

ALTER TABLE xayma_app.services
  ADD COLUMN IF NOT EXISTS deployment_template jsonb;
