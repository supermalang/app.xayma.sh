-- Self-registration approval rules:
--   1. Phone numbers must be unique across partners (enforced as both a
--      partial unique index AND an explicit pre-check in the trigger so the
--      client gets a recognizable error string).
--   2. Email uniqueness is already enforced by auth.users.
--   3. Email verification (confirmation link) is the standard Supabase flow,
--      enabled via the project's "Confirm email" auth setting in the
--      dashboard. No DB change is required for it.

-- Phone uniqueness across partners (partial: NULLs are allowed and not unique).
CREATE UNIQUE INDEX IF NOT EXISTS partners_phone_unique
  ON xayma_app.partners (phone)
  WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION xayma_app.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = xayma_app, public, pg_temp
AS $$
DECLARE
  v_firstname    TEXT;
  v_phone        TEXT;
  v_company_name TEXT;
  v_slug         TEXT;
  v_partner_id   INTEGER;
BEGIN
  v_firstname    := NULLIF(TRIM(NEW.raw_user_meta_data->>'firstname'), '');
  v_phone        := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
  v_company_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), '');

  -- No self-registration metadata -> programmatic/admin creation, do nothing.
  IF v_firstname IS NULL OR v_company_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pre-check phone uniqueness so we can surface a recognizable error.
  -- The unique index above is the actual integrity guarantee.
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM xayma_app.partners WHERE phone = v_phone
  ) THEN
    RAISE EXCEPTION 'phone_already_registered'
      USING ERRCODE = '23505';
  END IF;

  v_slug := TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_slug = '' THEN
    v_slug := 'partner';
  END IF;
  v_slug := v_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8);

  INSERT INTO xayma_app.partners (name, slug, email, phone, partner_type, status)
  VALUES (v_company_name, v_slug, NEW.email, v_phone, 'customer', 'active')
  RETURNING id INTO v_partner_id;

  INSERT INTO xayma_app.users (id, firstname, email, company_id, user_role)
  VALUES (NEW.id, v_firstname, NEW.email, v_partner_id, 'CUSTOMER');

  RETURN NEW;
END;
$$;
