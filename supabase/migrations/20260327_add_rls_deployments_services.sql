-- Enable RLS on deployments table
ALTER TABLE xayma_app.deployments ENABLE ROW LEVEL SECURITY;

-- Admin can see all deployments
CREATE POLICY "admin_view_all_deployments" ON xayma_app.deployments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can create deployments
CREATE POLICY "admin_create_deployments" ON xayma_app.deployments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can update any deployment
CREATE POLICY "admin_update_all_deployments" ON xayma_app.deployments
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can delete any deployment
CREATE POLICY "admin_delete_all_deployments" ON xayma_app.deployments
  FOR DELETE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Customers and Resellers can view their own deployments
CREATE POLICY "customer_view_own_deployments" ON xayma_app.deployments
  FOR SELECT
  TO authenticated
  USING (
    partner_id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
  );

-- Customers and Resellers can create deployments for their own company
CREATE POLICY "customer_create_own_deployments" ON xayma_app.deployments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
  );

-- Customers and Resellers can update their own deployments
CREATE POLICY "customer_update_own_deployments" ON xayma_app.deployments
  FOR UPDATE
  TO authenticated
  USING (
    partner_id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
  )
  WITH CHECK (
    partner_id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
  );

-- Customers and Resellers can delete their own deployments
CREATE POLICY "customer_delete_own_deployments" ON xayma_app.deployments
  FOR DELETE
  TO authenticated
  USING (
    partner_id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
  );

-- Enable RLS on services table
ALTER TABLE xayma_app.services ENABLE ROW LEVEL SECURITY;

-- Everyone can view publicly available services
CREATE POLICY "public_view_available_services" ON xayma_app.services
  FOR SELECT
  TO authenticated
  USING (isPubliclyAvailable = true);

-- Admin can view all services
CREATE POLICY "admin_view_all_services" ON xayma_app.services
  FOR SELECT
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can create services
CREATE POLICY "admin_create_services" ON xayma_app.services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can update any service
CREATE POLICY "admin_update_services" ON xayma_app.services
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can delete any service
CREATE POLICY "admin_delete_services" ON xayma_app.services
  FOR DELETE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Enable RLS on serviceplans table (related to services)
ALTER TABLE xayma_app.serviceplans ENABLE ROW LEVEL SECURITY;

-- Everyone can view plans for publicly available services
CREATE POLICY "public_view_available_plans" ON xayma_app.serviceplans
  FOR SELECT
  TO authenticated
  USING (
    service_id IN (
      SELECT id FROM xayma_app.services WHERE isPubliclyAvailable = true
    )
  );

-- Admin can view all plans
CREATE POLICY "admin_view_all_plans" ON xayma_app.serviceplans
  FOR SELECT
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can create plans
CREATE POLICY "admin_create_plans" ON xayma_app.serviceplans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can update plans
CREATE POLICY "admin_update_plans" ON xayma_app.serviceplans
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admin can delete plans
CREATE POLICY "admin_delete_plans" ON xayma_app.serviceplans
  FOR DELETE
  TO authenticated
  USING (
    (SELECT user_role FROM xayma_app.users WHERE id = auth.uid()) = 'ADMIN'
  );
