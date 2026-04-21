-- RLS Policies for Partners and Users Tables
-- Implements row-level security for multi-tenant isolation

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE xayma_app.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE xayma_app.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTNERS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all partners
CREATE POLICY "admin_full_access_partners"
ON xayma_app.partners
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

-- Customers/Resellers: can see and update their own partner record only
CREATE POLICY "partner_isolation_select"
ON xayma_app.partners
FOR SELECT
USING (
  id = (
    SELECT company_id FROM xayma_app.users
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

CREATE POLICY "partner_isolation_update"
ON xayma_app.partners
FOR UPDATE
USING (
  id = (
    SELECT company_id FROM xayma_app.users
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

CREATE POLICY "partner_isolation_insert"
ON xayma_app.partners
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

CREATE POLICY "partner_isolation_delete"
ON xayma_app.partners
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Admin: full access to all users
CREATE POLICY "admin_full_access_users"
ON xayma_app.users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM xayma_app.users AS admin_check
    WHERE admin_check.id = auth.uid() AND admin_check.user_role = 'ADMIN'
  )
);

-- Any authenticated user: can see and update own profile
CREATE POLICY "user_own_profile_select"
ON xayma_app.users
FOR SELECT
USING (
  id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

CREATE POLICY "user_own_profile_update"
ON xayma_app.users
FOR UPDATE
USING (
  id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

-- Customers/Resellers: can see users in their company
CREATE POLICY "user_company_isolation_select"
ON xayma_app.users
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM xayma_app.users
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
  OR
  id = auth.uid()
);

-- Admin only: insert/delete users
CREATE POLICY "user_insert_delete_admin_only"
ON xayma_app.users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

CREATE POLICY "user_delete_admin_only"
ON xayma_app.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to record partner changes
CREATE OR REPLACE FUNCTION xayma_app.audit_partner_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_value JSONB;
  v_new_value JSONB;
  v_user_id UUID;
  v_user_email VARCHAR;
  v_user_firstname VARCHAR;
  v_user_lastname VARCHAR;
  v_user_role xayma_app.user_role;
  v_company_id INTEGER;
BEGIN
  -- Get current user info from auth context
  v_user_id := auth.uid();

  -- Get user details from users table
  SELECT email, firstname, lastname, user_role, company_id
  INTO v_user_email, v_user_firstname, v_user_lastname, v_user_role, v_company_id
  FROM xayma_app.users WHERE id = v_user_id;

  -- Convert to JSONB for storage
  v_old_value := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
  v_new_value := CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END;

  -- Insert audit record
  INSERT INTO xayma_app.general_audit (
    table_name,
    record_id,
    action,
    description,
    old_value,
    new_value,
    user_id,
    email,
    firstname,
    lastname,
    company_id,
    user_role,
    created,
    modified
  ) VALUES (
    'partners',
    CAST(COALESCE(NEW.id, OLD.id) AS VARCHAR),
    TG_OP,
    'Partner ' || CASE WHEN TG_OP = 'INSERT' THEN 'created' WHEN TG_OP = 'UPDATE' THEN 'updated' ELSE 'deleted' END,
    v_old_value,
    v_new_value,
    v_user_id,
    v_user_email,
    v_user_firstname,
    v_user_lastname,
    v_company_id,
    v_user_role,
    NOW(),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record user changes
CREATE OR REPLACE FUNCTION xayma_app.audit_user_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_value JSONB;
  v_new_value JSONB;
  v_user_id UUID;
  v_user_email VARCHAR;
  v_user_firstname VARCHAR;
  v_user_lastname VARCHAR;
  v_user_role xayma_app.user_role;
  v_company_id INTEGER;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();

  SELECT email, firstname, lastname, user_role, company_id
  INTO v_user_email, v_user_firstname, v_user_lastname, v_user_role, v_company_id
  FROM xayma_app.users WHERE id = v_user_id;

  -- Convert to JSONB
  v_old_value := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
  v_new_value := CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END;

  -- Insert audit record
  INSERT INTO xayma_app.general_audit (
    table_name,
    record_id,
    action,
    description,
    old_value,
    new_value,
    user_id,
    email,
    firstname,
    lastname,
    company_id,
    user_role,
    created,
    modified
  ) VALUES (
    'users',
    CAST(COALESCE(NEW.id, OLD.id) AS VARCHAR),
    TG_OP,
    'User ' || CASE WHEN TG_OP = 'INSERT' THEN 'created' WHEN TG_OP = 'UPDATE' THEN 'updated' ELSE 'deleted' END,
    v_old_value,
    v_new_value,
    v_user_id,
    v_user_email,
    v_user_firstname,
    v_user_lastname,
    v_company_id,
    v_user_role,
    NOW(),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER partners_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON xayma_app.partners
FOR EACH ROW
EXECUTE FUNCTION xayma_app.audit_partner_changes();

CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON xayma_app.users
FOR EACH ROW
EXECUTE FUNCTION xayma_app.audit_user_changes();

-- ============================================================================
-- INDEXES FOR AUDIT LOG QUERIES
-- ============================================================================

CREATE INDEX idx_audit_table_name ON xayma_app.general_audit(table_name);
CREATE INDEX idx_audit_action ON xayma_app.general_audit(action);
CREATE INDEX idx_audit_created ON xayma_app.general_audit(created DESC);
CREATE INDEX idx_audit_user_id ON xayma_app.general_audit(user_id);
CREATE INDEX idx_audit_record_id ON xayma_app.general_audit(record_id);
