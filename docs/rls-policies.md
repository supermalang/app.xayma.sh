# Row-Level Security (RLS) Policies

All sensitive data access is controlled via database service RLS policies. The frontend has **zero authority** to filter or restrict data — all filtering happens at the database layer.

## Policies Overview

### Partners Table (`xayma_app.partners`)

| Policy | Role | Effect | Logic |
|--------|------|--------|-------|
| `admin_full_access` | ADMIN | SELECT/INSERT/UPDATE/DELETE | User role = 'ADMIN' |
| `partner_isolation` | CUSTOMER/RESELLER | SELECT/UPDATE | `partner_id = user.company_id` |
| `partner_insert` | CUSTOMER/RESELLER | INSERT | Only on own company_id |

**Rules:**
- Admins can see all partners
- Customers/Resellers can only see their own partner record (via `company_id` match)
- Customers/Resellers cannot INSERT with a different `company_id`
- DELETE is admin-only

### Users Table (`xayma_app.users`)

| Policy | Role | Effect | Logic |
|--------|------|--------|-------|
| `admin_full_access` | ADMIN | SELECT/INSERT/UPDATE/DELETE | User role = 'ADMIN' |
| `user_isolation` | CUSTOMER/RESELLER | SELECT/UPDATE | `company_id = user.company_id` |
| `user_own_profile` | All authenticated | SELECT/UPDATE | `id = auth.uid()` (own profile only) |

**Rules:**
- Admins can see all users
- Customers/Resellers can see only users in their company
- Any authenticated user can read/update their own profile
- DELETE is admin-only

## Implementation Details

All policies:
1. **Are enabled** by default (RLS enforced on the table)
2. **Use `auth.uid()`** from database service Auth — never trust frontend role claims
3. **Join users table** for company_id lookup when needed
4. **Are tested** in E2E suite before deployment

## Testing RLS

To verify RLS is working:

```sql
-- As ADMIN: should see all partners
SELECT id, name FROM xayma_app.partners;

-- As CUSTOMER with company_id=5: should see only partner with id=5
-- (RLS filters automatically)
SELECT id, name FROM xayma_app.partners;
```

If a user queries data outside their scope, the result is **empty**, not an error.

## Common Mistakes

❌ **Filtering on frontend:** `where: { company_id: userCompanyId }`
✅ **Trust RLS:** Just query `SELECT *` — RLS handles filtering

❌ **Using anon key for admin operations**
✅ **Use service role key** (workflow engine only) for admin mutations from backend

---

## Grant & Revoke

Policies are created in a **single migration file**: `database service/migrations/20240326_rls_partners_users.sql`

To disable RLS (dev/testing only):
```sql
ALTER TABLE xayma_app.partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE xayma_app.users DISABLE ROW LEVEL SECURITY;
```

To re-enable:
```sql
ALTER TABLE xayma_app.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE xayma_app.users ENABLE ROW LEVEL SECURITY;
```
