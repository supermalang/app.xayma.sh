-- ============================================================
-- Xayma.sh — PostgreSQL Audit Triggers
-- Target schema: xayma_app
-- Target audit table: xayma_app.general_audit
-- ============================================================
-- Every INSERT/UPDATE/DELETE on core tables writes one row to
-- general_audit with old_value and new_value as JSONB.
-- The trigger function resolves the calling user from
-- xayma_app.users using auth.uid().
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Shared trigger function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xayma_app.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id   UUID;
  v_email     VARCHAR(255);
  v_firstname VARCHAR(50);
  v_lastname  VARCHAR(50);
  v_company_id INTEGER;
  v_user_role  xayma_app.user_role;
  v_record_id  VARCHAR(255);
  v_old_value  JSONB := NULL;
  v_new_value  JSONB := NULL;
BEGIN
  -- Resolve calling user from Supabase Auth JWT
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT
      u.email,
      u.firstname,
      u.lastname,
      u.company_id,
      u.user_role
    INTO
      v_email,
      v_firstname,
      v_lastname,
      v_company_id,
      v_user_role
    FROM xayma_app.users u
    WHERE u.id = v_user_id;
  END IF;

  -- Derive record_id from NEW or OLD row
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::VARCHAR;
    v_old_value := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::VARCHAR;
    v_new_value := to_jsonb(NEW);
  ELSE
    -- UPDATE
    v_record_id := NEW.id::VARCHAR;
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
  END IF;

  INSERT INTO xayma_app.general_audit (
    table_name,
    record_id,
    action,
    old_value,
    new_value,
    user_id,
    email,
    firstname,
    lastname,
    company_id,
    user_role,
    created
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_old_value,
    v_new_value,
    v_user_id,
    v_email,
    v_firstname,
    v_lastname,
    v_company_id,
    v_user_role,
    now()
  );

  -- For DELETE return OLD so the original operation succeeds
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. partners table
-- ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_partners ON xayma_app.partners;

CREATE TRIGGER trg_audit_partners
AFTER INSERT OR UPDATE OR DELETE
ON xayma_app.partners
FOR EACH ROW
EXECUTE FUNCTION xayma_app.fn_audit_trigger();

-- ────────────────────────────────────────────────────────────
-- 3. users table
-- ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_users ON xayma_app.users;

CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE
ON xayma_app.users
FOR EACH ROW
EXECUTE FUNCTION xayma_app.fn_audit_trigger();

-- ────────────────────────────────────────────────────────────
-- NOTE: Apply this file as a Supabase migration:
--   npm run supabase:push
-- or paste directly in the Supabase SQL editor.
--
-- To add audit coverage to a new table, run:
--   CREATE TRIGGER trg_audit_<tablename>
--   AFTER INSERT OR UPDATE OR DELETE
--   ON xayma_app.<tablename>
--   FOR EACH ROW
--   EXECUTE FUNCTION xayma_app.fn_audit_trigger();
-- ────────────────────────────────────────────────────────────
