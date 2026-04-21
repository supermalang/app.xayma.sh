-- Fix infinite recursion in users table RLS policies
-- Root cause: policies queried xayma_app.users to check role,
-- which triggered the same policies → infinite loop.
-- Solution: security definer functions bypass RLS when called.

-- Drop old recursive policies
DROP POLICY IF EXISTS "admin_full_access_users" ON xayma_app.users;
DROP POLICY IF EXISTS "user_own_profile_select" ON xayma_app.users;
DROP POLICY IF EXISTS "user_own_profile_update" ON xayma_app.users;
DROP POLICY IF EXISTS "user_company_isolation_select" ON xayma_app.users;
DROP POLICY IF EXISTS "user_insert_delete_admin_only" ON xayma_app.users;
DROP POLICY IF EXISTS "user_delete_admin_only" ON xayma_app.users;
DROP POLICY IF EXISTS "admin_all" ON xayma_app.users;
DROP POLICY IF EXISTS "partner_isolation" ON xayma_app.users;

-- Security definer functions: bypass RLS to read current user's own row
CREATE OR REPLACE FUNCTION xayma_app.current_user_role()
RETURNS xayma_app.user_role
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT user_role FROM xayma_app.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION xayma_app.current_user_company_id()
RETURNS bigint
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM xayma_app.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Non-recursive policies
CREATE POLICY "users_read_own" ON xayma_app.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_read_same_company" ON xayma_app.users
  FOR SELECT USING (company_id = xayma_app.current_user_company_id());

CREATE POLICY "users_admin_all" ON xayma_app.users
  FOR ALL USING (xayma_app.current_user_role() = 'ADMIN');

CREATE POLICY "users_insert_own" ON xayma_app.users
  FOR INSERT WITH CHECK (id = auth.uid());
