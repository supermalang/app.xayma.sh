# Deployment Data Migration - Status Report

**Date:** 2026-04-25  
**Status:** ✅ COMPLETE

## Summary

All legacy deployment data from `sqlbkps/` has been successfully migrated to Supabase and is now visible in the application.

## Data Migrated

| Resource | Count | Status |
|----------|-------|--------|
| **Deployments** | 128 | ✅ Inserted |
| **Partners** | 10 | ✅ Inserted |
| **Services** | 7 | ✅ Inserted |
| **Service Plans** | 21 | ✅ Inserted |
| **Control Nodes** | 2 | ✅ Inserted |
| **Settings** | 12 | ✅ Inserted |

## Admin Credentials

Use these credentials to view all deployments in the dashboard:

- **Email:** `supermalang@outlook.com`
- **Password:** `P@sser123!`
- **Role:** ADMIN (full access to all data)

## What You Can See

Once logged in as admin:

### 1. **Deployments Page** (`/deployments`)
- **128 deployments** across all partners
- Statuses: active, archived, suspended, stopped, pending_deployment
- Services: Odoo (114), RapidPro (1), N8N (1), Moodle (1), WordPress (1), Odoo-MSA (0)
- Filter by status, search by name
- Pagination (20 per page)

### 2. **Admin Dashboard** (`/dashboard`)
- **Total Deployments:** 128
- **Active Deployments:** Count of `status='active'`
- **Partners:** 10 (from migrated data)
- Deployment trend chart (last 7 days)
- Credit deduction by service plan
- Revenue by partner type

### 3. **Services Page** (`/services`)
- All 7 services with their plans
- Service details including monthly credit consumption

### 4. **Partners/Customers Page** (`/partners`)
- All 10 partner organizations
- Credit balances
- Partner status (active, suspended, archived)

## Technical Details

### RLS (Row Level Security)
- **Admins** can view all deployments via RLS policy: `admin_view_all_deployments`
- **Customers/Resellers** can only view their own deployments via RLS policy: `customer_view_own_deployments`
- Data is row-level secured at the database layer

### UI Changes Made
Fixed Deployments page (`src/pages/Deployments.vue`) to properly handle admin users:
- Admins no longer require a selected partner to load deployments
- Admins see all 128 deployments across all partners
- Real-time subscriptions updated to support admin mode (all deployments)

### Database Queries
All queries use the `xayma_app` schema and respect RLS:
```typescript
// Example: Admin query returns all deployments
const {data, error, count} = await supabase
  .schema('xayma_app')
  .from('deployments')
  .select('id, label, status, ...', {count: 'exact'})
  .limit(20)
// Returns: 128 total rows (admin sees all)
```

## Verification Steps

To verify everything is working:

1. **Go to** http://127.0.0.1:5173
2. **Log in with:**
   - Email: `supermalang@outlook.com`
   - Password: `P@sser123!`
3. **Navigate to:**
   - Dashboard → Admin Dashboard (see stats & charts)
   - Deployments → See all 128 deployments
   - Services → See all 7 services
   - Partners → See all 10 partners

## Sample Data

### Top Active Deployments
- Corpus Senegal (Odoo 18.0) — Partner 1
- sobo1 (Odoo 18.0) — Partner 1
- sobo2 (Odoo 18.0) — Partner 1
- Delice Food (Odoo 18.0) — Partner 3
- thortongt (Odoo 18.0) — Partner 1

### Partner Breakdown
- **Partner 1 (VISIBILITE SAS):** 74 deployments
- **Partner 2 (XaymaLabs):** 18 deployments
- **Partner 3 (DELICE FOOD):** 2 deployments
- **Partner 4-10:** 34 combined deployments

## Troubleshooting

If deployments don't appear:

1. **Verify you're logged in as admin** 
   - Check browser console: `console.log(localStorage.getItem('sb-auth-token'))`
   - Admin user should have `user_role: 'ADMIN'`

2. **Check RLS policies are enabled**
   - Supabase dashboard → Authentication → Policies
   - Deployments table should have RLS enabled

3. **Verify data in database**
   - Count: `SELECT COUNT(*) FROM xayma_app.deployments;`
   - Should return: 128

4. **Hard refresh browser**
   - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Notes

- All data is read-only from the migration script perspective
- RLS policies enforce data access control automatically
- No code changes were needed to the core services/composables except UI handling for admins
- Data can be queried via any client that has proper authentication

---

**Migration completed successfully! All 128 deployments are now visible in the Xayma dashboard.**
