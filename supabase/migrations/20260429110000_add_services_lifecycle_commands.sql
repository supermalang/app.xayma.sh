-- Lifecycle command map for each service. Keys: start, stop, restart, suspend, archive, domain.
-- Values: shell commands the orchestrator runs when the corresponding lifecycle event fires.
-- JSONB lets the six events stay in one row without joins; defaults to {} so existing rows stay valid.

ALTER TABLE xayma_app.services
  ADD COLUMN IF NOT EXISTS lifecycle_commands jsonb NOT NULL DEFAULT '{}'::jsonb;
