-- Move plans from xayma_app.serviceplans → xayma_app.services.plans (jsonb).
-- Replace deployments.serviceplanId int FK with deployments.plan_slug text
-- (keyed against the plan slug inside services.plans).
-- Backfill, then drop the FK and the legacy table.

-- 1. New columns
ALTER TABLE xayma_app.services
  ADD COLUMN IF NOT EXISTS plans jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE xayma_app.deployments
  ADD COLUMN IF NOT EXISTS plan_slug text;

-- 2. Backfill services.plans from existing serviceplans rows
UPDATE xayma_app.services s
SET plans = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'slug', p.slug,
        'label', p.label,
        'description', p.description,
        'monthlyCreditConsumption', p."monthlyCreditConsumption",
        'options', COALESCE(to_jsonb(p.options), '[]'::jsonb)
      )
      ORDER BY p.created
    )
    FROM xayma_app.serviceplans p
    WHERE p.service_id = s.id
  ),
  '[]'::jsonb
);

-- 3. Backfill deployments.plan_slug from the FK
UPDATE xayma_app.deployments d
SET plan_slug = p.slug
FROM xayma_app.serviceplans p
WHERE d."serviceplanId" = p.id;

-- 4. Lock down plan_slug now that it's populated
ALTER TABLE xayma_app.deployments
  ALTER COLUMN plan_slug SET NOT NULL;

-- 5. Drop the old FK and column on deployments
ALTER TABLE xayma_app.deployments
  DROP CONSTRAINT IF EXISTS "deployments_serviceplanId_fkey";

ALTER TABLE xayma_app.deployments
  DROP COLUMN IF EXISTS "serviceplanId";

-- 6. Drop the legacy table (RLS policies on serviceplans go with it)
DROP TABLE IF EXISTS xayma_app.serviceplans;
