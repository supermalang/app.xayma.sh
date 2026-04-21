-- Grant xayma_app schema access to PostgREST roles
-- Required for Supabase JS SDK .schema('xayma_app') calls to work

GRANT USAGE ON SCHEMA xayma_app TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA xayma_app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA xayma_app TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA xayma_app TO anon, authenticated, service_role;

-- Ensure future tables also get permissions automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA xayma_app
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA xayma_app
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
