-- Public bucket for service logos uploaded from the create-service form.
-- Reads are public (logos appear in the marketplace); writes require an authenticated user.

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-logos', 'service-logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public can read service logos" ON storage.objects;
CREATE POLICY "Public can read service logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-logos');

DROP POLICY IF EXISTS "Authenticated can upload service logos" ON storage.objects;
CREATE POLICY "Authenticated can upload service logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-logos');

DROP POLICY IF EXISTS "Authenticated can update service logos" ON storage.objects;
CREATE POLICY "Authenticated can update service logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-logos')
  WITH CHECK (bucket_id = 'service-logos');
