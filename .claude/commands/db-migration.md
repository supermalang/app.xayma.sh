# /db-migration — Generate database service SQL Migration

## Usage
```
/db-migration 2.14
```

## Purpose
Generate a SQL migration file for database service schema changes (new table, column, RLS policy, trigger).

## Output
Creates a timestamped migration file in `database service/migrations/`:
```
database service/migrations/20260326_121530_create_deployments_table.sql
```

## Migration Template

### Create Table (with schema prefix)
```sql
-- Create deployments table
create table xayma_app.deployments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references xayma_app.partners(id) on delete cascade,
  name text not null,
  service_type text not null check (service_type in ('web application', 'custom')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'deleted')),
  domain text not null unique,
  docker_image text,
  web application_version text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint valid_domain check (valid_domain_array(ARRAY[domain]))
);

-- Enable RLS
alter table xayma_app.deployments enable row level security;

-- RLS Policy: Customers see only their own deployments
create policy \"Customers see own deployments\"\n  on xayma_app.deployments for select\n  using (\n    auth.uid() = (select user_id from xayma_app.partners where id = company_id)\n  );\n\n-- RLS Policy: Admins see all deployments\ncreate policy \"Admins see all deployments\"\n  on xayma_app.deployments for select\n  using (\n    (select user_role from auth.users where id = auth.uid()) = 'ADMIN'\n  );\n\n-- Audit trigger\ncreate trigger deployments_audit\n  after insert or update or delete on xayma_app.deployments\n  for each row\n  execute function xayma_app.audit_trigger();\n\n-- Indexes\ncreate index idx_deployments_company_id on xayma_app.deployments(company_id);\ncreate index idx_deployments_status on xayma_app.deployments(status);\ncreate index idx_deployments_created_at on xayma_app.deployments(created_at);\n```\n\n### Add Column\n```sql\n-- Add remaining_credits column to partners\nalter table xayma_app.partners\nadd column remaining_credits numeric(12, 2) not null default 0;\n\n-- Create index for queries\ncreate index idx_partners_remaining_credits on xayma_app.partners(remaining_credits);\n```\n\n### Create RLS Policy\n```sql\n-- RLS: Resellers see their team's partners\ncreate policy \"Resellers see assigned partners\"\n  on xayma_app.partners for select\n  using (\n    exists (\n      select 1 from xayma_app.partner_resellers\n      where partner_id = partners.id\n      and reseller_id = auth.uid()\n    )\n  );\n```\n\n### Create Audit Trigger\n```sql\n-- Audit function (if not exists)\ncreate or replace function xayma_app.audit_trigger()\nreturns trigger as $$\nbegin\n  insert into xayma_app.general_audit (\n    table_name,\n    action,\n    user_id,\n    old_values,\n    new_values,\n    created_at\n  ) values (\n    tg_table_name,\n    tg_op,\n    auth.uid(),\n    row_to_json(old),\n    row_to_json(new),\n    now()\n  );\n  return coalesce(new, old);\nend;\n$$ language plpgsql security definer;\n\n-- Apply trigger\ncreate trigger deployments_audit\n  after insert or update or delete on xayma_app.deployments\n  for each row\n  execute function xayma_app.audit_trigger();\n```\n\n## Migration Best Practices\n\n### 1. Schema Prefix\n**Always** use `xayma_app.` prefix in production migrations:\n```sql\n-- CORRECT\ncreate table xayma_app.new_table (...)\nalter table xayma_app.existing_table add column ...\n\n-- WRONG (public schema)\ncreate table new_table (...)\n```\n\n### 2. Constraints & Validation\n```sql\n-- Use check constraints\ncheck (status in ('pending', 'active', 'suspended'))\n\n-- Use relational database functions\ncheck (valid_domain_array(ARRAY[domain]))\n\n-- Use foreign keys\nreferences xayma_app.partners(id) on delete cascade\n```\n\n### 3. RLS Policies\n```sql\n-- Every table with sensitive data gets RLS\nalter table xayma_app.deployments enable row level security;\n\n-- Create policies for each role\ncreate policy \"...\"\n  on xayma_app.deployments\n  for select/insert/update/delete\n  using (...)  -- select policy\n  with check (...)  -- insert/update policy\n```\n\n### 4. Audit Triggers\n```sql\n-- All mutations on core tables are audited\ncreate trigger table_name_audit\n  after insert or update or delete on xayma_app.table_name\n  for each row\n  execute function xayma_app.audit_trigger();\n```\n\n### 5. Indexes for Performance\n```sql\n-- Index common WHERE conditions\ncreate index idx_table_column on xayma_app.table(column);\n\n-- Composite indexes for multi-column filters\ncreate index idx_table_col1_col2 on xayma_app.table(col1, col2);\n\n-- Indexes on FK columns\ncreate index idx_table_fk_id on xayma_app.table(fk_id);\n```\n\n## Validation Checklist\n- [ ] Table names prefixed with `xayma_app.`\n- [ ] All foreign keys defined with cascade rules\n- [ ] Check constraints validate business rules\n- [ ] RLS enabled and policies defined\n- [ ] Audit trigger applied to core tables\n- [ ] Indexes on FK and WHERE columns\n- [ ] Timestamp columns (created_at, updated_at)\n- [ ] Comments on complex columns\n- [ ] Migration is reversible (if possible)\n- [ ] No hardcoded UUIDs or IDs in migration\n\n## Apply Migration\n\n```bash\n# Push to database service (linked project)\nnpm run database service:push\n\n# Or manually in database service dashboard\n# 1. Open https://database service.com\n# 2. Project → SQL Editor\n# 3. Paste migration SQL\n# 4. Run\n\n# Generate TypeScript types\nnpm run database service:types\n# Updates: src/types/database service.ts\n```\n\n## Testing the Migration\n\n```sql\n-- After migration runs\n\n-- Verify table exists\nselect * from information_schema.tables\nwhere table_schema = 'xayma_app'\nand table_name = 'deployments';\n\n-- Verify RLS policies\nselect policyname, qual from pg_policies\nwhere schemaname = 'xayma_app'\nand tablename = 'deployments';\n\n-- Verify indexes\nselect indexname from pg_indexes\nwhere schemaname = 'xayma_app'\nand tablename = 'deployments';\n\n-- Verify triggers\nselect trigger_name from information_schema.triggers\nwhere event_object_schema = 'xayma_app'\nand event_object_table = 'deployments';\n```\n\n## Reference Files\n- `docs/specs/SPEC_05_DATABASE_DESIGN.md` — Schema definitions\n- `CLAUDE.md` → Architecture Rule §4 (RLS)\n- `database service/migrations/` — Existing migrations\n- relational database docs → RLS, Triggers, Indexes\n