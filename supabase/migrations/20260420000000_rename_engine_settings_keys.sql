-- Safely rename n8n and awx settings keys to generic engine names
-- Migration is idempotent: only updates if key exists

-- Rename n8n keys to workflow_engine keys
UPDATE xayma_app.settings
SET key = 'workflow_engine_webhook_base_url'
WHERE key = 'n8n_webhook_base_url';

UPDATE xayma_app.settings
SET key = 'workflow_engine_api_key'
WHERE key = 'n8n_api_key';

-- Rename awx keys to deployment_engine keys
UPDATE xayma_app.settings
SET key = 'deployment_engine_base_url'
WHERE key = 'awx_base_url';

UPDATE xayma_app.settings
SET key = 'deployment_engine_api_key'
WHERE key = 'awx_api_key';

-- Document the change
COMMENT ON TABLE xayma_app.settings IS
'Platform-wide configuration. Keys use generic terminology (workflow_engine, deployment_engine) to decouple from specific implementations.';
