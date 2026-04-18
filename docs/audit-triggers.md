# Audit Triggers Documentation

All changes to critical tables are automatically logged to `xayma_app.general_audit` via PostgreSQL triggers.

## Audited Tables

| Table | Trigger | Events | Log |
|-------|---------|--------|-----|
| `partners` | `partners_audit_trigger` | INSERT/UPDATE/DELETE | All changes logged |
| `users` | `users_audit_trigger` | INSERT/UPDATE/DELETE | All changes logged |

## Audit Record Structure

Each audit record captures:

```sql
audit_id        SERIAL PK              -- Auto-generated
table_name      VARCHAR(150)           -- Table affected
record_id       VARCHAR(255)           -- ID of changed record
action          VARCHAR(10)            -- INSERT, UPDATE, or DELETE
description     TEXT                   -- Human-readable summary
old_value       JSONB                  -- Previous state (on UPDATE/DELETE)
new_value       JSONB                  -- New state (on INSERT/UPDATE)
user_id         UUID                   -- Who made the change
email           VARCHAR(255)           -- User's email
firstname       VARCHAR(50)            -- User's first name
lastname        VARCHAR(50)            -- User's last name
company_id      INTEGER                -- User's company (partner)
user_role       VARCHAR                -- User's role at time of change
created         TIMESTAMPTZ            -- Timestamp of change
modified        TIMESTAMPTZ            -- Updated timestamp
```

## Trigger Implementation

### Trigger Functions

**`audit_partner_changes()`** — fires after any change to `partners` table
**`audit_user_changes()`** — fires after any change to `users` table

Both functions:
1. Capture the authenticated user's ID via `auth.uid()`
2. Look up user details (email, firstname, lastname, role, company_id) from `users` table
3. Serialize OLD/NEW row data to JSONB
4. Insert audit record with full context
5. Return the modified row (allows trigger to continue)

### Security

Triggers run with `SECURITY DEFINER` — they execute with their **own privileges**, not the calling user's. This ensures:
- Audit records are always written (even if RLS would block the user from seeing other records)
- User info is always captured accurately
- Audit trail cannot be bypassed

## Querying the Audit Log

### All changes to partners
```sql
SELECT * FROM xayma_app.general_audit
WHERE table_name = 'partners'
ORDER BY created DESC;
```

### Changes by specific user
```sql
SELECT * FROM xayma_app.general_audit
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created DESC;
```

### Deletions only
```sql
SELECT * FROM xayma_app.general_audit
WHERE action = 'DELETE'
ORDER BY created DESC;
```

### What changed for a specific record
```sql
SELECT action, old_value, new_value, created
FROM xayma_app.general_audit
WHERE table_name = 'partners' AND record_id = '123'
ORDER BY created;
```

## Performance Considerations

**Indexes** on audit table speed up common queries:
- `idx_audit_table_name` — filter by table
- `idx_audit_action` — filter by INSERT/UPDATE/DELETE
- `idx_audit_created` — sort by date (DESC)
- `idx_audit_user_id` — find changes by user
- `idx_audit_record_id` — find all changes to a record

The audit table is **append-only** — records are never updated or deleted. This maintains an immutable audit trail.

## Deployment

Triggers are created in migration: `supabase/migrations/20240326_rls_partners_users.sql`

To apply:
```bash
npm run supabase:push
```

To disable triggers (dev/testing):
```sql
DROP TRIGGER partners_audit_trigger ON xayma_app.partners;
DROP TRIGGER users_audit_trigger ON xayma_app.users;
```

To re-enable:
```sql
CREATE TRIGGER partners_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON xayma_app.partners
FOR EACH ROW
EXECUTE FUNCTION xayma_app.audit_partner_changes();

CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON xayma_app.users
FOR EACH ROW
EXECUTE FUNCTION xayma_app.audit_user_changes();
```

## Testing Audit Triggers

```sql
-- Insert a partner and check audit log
INSERT INTO xayma_app.partners (name, slug, status, remainingCredits, created, createdby)
VALUES ('Test Partner', 'test-partner', 'active', 100, NOW(), auth.uid());

SELECT * FROM xayma_app.general_audit
WHERE table_name = 'partners' AND action = 'INSERT'
ORDER BY created DESC LIMIT 1;
```

Should show the new partner's details in `new_value` JSONB field.
