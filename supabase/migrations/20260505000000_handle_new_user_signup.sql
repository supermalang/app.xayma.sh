-- Self-registration sync: auth.users -> xayma_app.partners + xayma_app.users
-- Reads firstname / phone / company_name from auth.users.raw_user_meta_data
-- (set by supabase.auth.signUp({ options: { data: ... } }) on the client).
-- Skips silently when metadata is absent so admin-created auth users keep working.

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

  -- No self-registration metadata -> assume admin/programmatic creation, do nothing.
  IF v_firstname IS NULL OR v_company_name IS NULL THEN
    RETURN NEW;
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

-- Allow the auth schema's trigger executor to call this function.
GRANT EXECUTE ON FUNCTION xayma_app.handle_new_user() TO postgres, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION xayma_app.handle_new_user();
