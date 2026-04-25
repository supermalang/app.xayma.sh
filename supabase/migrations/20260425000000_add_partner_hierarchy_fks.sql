-- Add reseller hierarchy and sales agent FK columns to partners table
-- managed_by_reseller_id: links a customer partner to their reseller partner
-- sales_agent_id: links a partner to the sales user (auth.users) who manages them

ALTER TABLE xayma_app.partners
  ADD COLUMN IF NOT EXISTS managed_by_reseller_id bigint
    REFERENCES xayma_app.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partners_managed_by_reseller_id_idx
  ON xayma_app.partners (managed_by_reseller_id);

CREATE INDEX IF NOT EXISTS partners_sales_agent_id_idx
  ON xayma_app.partners (sales_agent_id);

-- RLS: Reseller users can read partners they manage
-- Uses current_user_company_id() security-definer function to avoid RLS recursion
CREATE POLICY "Resellers can read their managed partners"
  ON xayma_app.partners
  FOR SELECT
  USING (
    managed_by_reseller_id = xayma_app.current_user_company_id()
  );

-- RLS: Sales users can read partners in their portfolio
CREATE POLICY "Sales agents can read their portfolio partners"
  ON xayma_app.partners
  FOR SELECT
  USING (sales_agent_id = auth.uid());
