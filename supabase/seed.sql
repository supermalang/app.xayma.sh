-- Seed data for Xayma.sh development
-- Run via: npx supabase db push --linked (or paste in Supabase SQL Editor)
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING

-- Disable audit triggers during seed to avoid type cast issues
ALTER TABLE xayma_app.partners DISABLE TRIGGER partners_audit_trigger;
ALTER TABLE xayma_app.users DISABLE TRIGGER users_audit_trigger;

-- ============================================================================
-- CONTROL NODES
-- ============================================================================

INSERT INTO xayma_app.control_nodes (id, name, hostname, ipaddress, status)
VALUES
  (1, 'Node Principal Dakar', 'node-dakar-01.xayma.sh', '49.12.1.100', 'active'),
  (2, 'Node Secondaire Abidjan', 'node-abidjan-01.xayma.sh', '49.12.1.101', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SERVICES
-- ============================================================================

INSERT INTO xayma_app.services (id, name, slug, description, "isPubliclyAvailable", "controlNodeId")
VALUES
  (1, 'Odoo Community', 'odoo-community', 'ERP open source complet pour PMEs — gestion, comptabilité, CRM, stock', true, 1),
  (2, 'WordPress', 'wordpress', 'CMS leader mondial pour sites web et blogs professionnels', true, 1),
  (3, 'Nextcloud', 'nextcloud', 'Solution de stockage et collaboration cloud privé', true, 1),
  (4, 'Application Docker', 'custom-docker', 'Déploiement de votre propre image Docker sur infrastructure dédiée', false, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SERVICE PLANS
-- ============================================================================

INSERT INTO xayma_app.serviceplans (id, service_id, label, slug, description, "monthlyCreditConsumption", options)
VALUES
  -- Odoo
  (1,  1, 'Starter',    'odoo-starter',    'Jusqu''à 5 utilisateurs, 10 Go stockage',       10, ARRAY['5 utilisateurs', '10 Go stockage', 'Support email']),
  (2,  1, 'Pro',        'odoo-pro',        'Jusqu''à 20 utilisateurs, 50 Go stockage',       20, ARRAY['20 utilisateurs', '50 Go stockage', 'Support prioritaire', 'Sauvegardes quotidiennes']),
  (3,  1, 'Enterprise', 'odoo-enterprise', 'Utilisateurs illimités, 200 Go stockage',        50, ARRAY['Utilisateurs illimités', '200 Go stockage', 'Support 24/7', 'SLA 99.9%']),
  -- WordPress
  (4,  2, 'Starter',    'wp-starter',      '1 site, 5 Go stockage, SSL inclus',              8,  ARRAY['1 site', '5 Go stockage', 'SSL inclus']),
  (5,  2, 'Pro',        'wp-pro',          '3 sites, 20 Go stockage, CDN inclus',            15, ARRAY['3 sites', '20 Go stockage', 'CDN inclus', 'Sauvegardes quotidiennes']),
  -- Nextcloud
  (6,  3, 'Starter',    'nextcloud-starter','50 Go stockage, 5 utilisateurs',                6,  ARRAY['50 Go stockage', '5 utilisateurs', 'Partage de fichiers']),
  (7,  3, 'Pro',        'nextcloud-pro',   '500 Go stockage, 25 utilisateurs',               18, ARRAY['500 Go stockage', '25 utilisateurs', 'Collaboration documents', 'Visioconférence']),
  -- Docker
  (8,  4, 'Standard',   'docker-standard', '2 vCPU, 4 Go RAM, 20 Go stockage',              25, ARRAY['2 vCPU', '4 Go RAM', '20 Go stockage']),
  (9,  4, 'Premium',    'docker-premium',  '4 vCPU, 8 Go RAM, 50 Go stockage',              45, ARRAY['4 vCPU', '8 Go RAM', '50 Go stockage', 'IP dédiée'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTNERS
-- ============================================================================

INSERT INTO xayma_app.partners (id, name, slug, email, phone, address, partner_type, status, "remainingCredits", "allowCreditDebt", description)
VALUES
  (1, 'Teranga Solutions',    'teranga-solutions',    'contact@teranga.sn',     '771234567', 'Plateau, Dakar',        'customer',    'active',     45,  false, 'Cabinet de conseil en transformation digitale'),
  (2, 'Sahel Tech SARL',     'sahel-tech',           'info@saheltech.sn',      '786543210', 'Almadies, Dakar',       'customer',    'low_credit', 8,   false, 'Startup spécialisée en solutions fintech'),
  (3, 'DigiAfrica Revendeur','digiafrica-revendeur',  'admin@digiafrica.sn',    '778889990', 'Liberté 6, Dakar',     'reseller',    'active',     320, true,  'Revendeur agréé Xayma pour le marché sénégalais'),
  (4, 'Côte Sud Bureautique','cote-sud-bureautique',  'contact@cotesud.ci',     '0701234567','Cocody, Abidjan',       'customer',    'active',     72,  false, 'PME spécialisée en fournitures et services bureautiques'),
  (5, 'AfriResell Pro',      'afriresell-pro',        'pro@afriresell.sn',      '775556677', 'Ngor, Dakar',           'pro_reseller','active',     890, true,  'Revendeur premium avec portefeuille de 12 clients actifs')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREDIT PURCHASE OPTIONS (discount tiers)
-- ============================================================================

INSERT INTO xayma_app.partner_credit_purchase_options (id, partner_type, threshold_type, threshold_value, threshold_discount_percent, max_credit_debt_allowed)
VALUES
  (1, 'customer',    'minimal',  10, 0.00, 0),
  (2, 'customer',    'middle',   20, 0.10, 0),
  (3, 'customer',    'maximum',  40, 0.20, 0),
  (4, 'reseller',    'minimal',  10, 0.15, 10),
  (5, 'reseller',    'middle',   20, 0.20, 20),
  (6, 'reseller',    'maximum',  40, 0.30, 40),
  (7, 'pro_reseller','minimal',  10, 0.20, 20),
  (8, 'pro_reseller','middle',   20, 0.25, 40),
  (9, 'pro_reseller','maximum',  40, 0.35, 80)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================

INSERT INTO xayma_app.deployments (id, label, slug, "domainNames", service_id, "serviceplanId", "serviceVersion", partner_id, status)
VALUES
  -- Teranga Solutions (partner 1)
  (1, 'ERP Principal',         'teranga-erp-principal',     ARRAY['erp.teranga.sn'],                  1, 2, '17.0', 1, 'active'),
  (2, 'Site Institutionnel',   'teranga-site-web',          ARRAY['www.teranga.sn', 'teranga.sn'],    2, 4, '6.4',  1, 'active'),

  -- Sahel Tech (partner 2 — low credits, 1 suspended)
  (3, 'Gestion Commerciale',   'saheltech-crm',             ARRAY['crm.saheltech.sn'],                1, 1, '16.0', 2, 'suspended'),
  (4, 'Blog Actualités',       'saheltech-blog',            ARRAY['blog.saheltech.sn'],               2, 4, '6.4',  2, 'active'),

  -- DigiAfrica Revendeur (partner 3)
  (5, 'Portail Revendeur',     'digiafrica-portail',        ARRAY['portail.digiafrica.sn'],           1, 3, '17.0', 3, 'active'),
  (6, 'Stockage Équipe',       'digiafrica-cloud',          ARRAY['cloud.digiafrica.sn'],             3, 7, '28.0', 3, 'active'),

  -- Côte Sud (partner 4)
  (7, 'Boutique En Ligne',     'cotesud-boutique',          ARRAY['shop.cotesud.ci'],                 2, 5, '6.4',  4, 'active'),

  -- AfriResell Pro (partner 5)
  (8, 'Plateforme Principale', 'afriresell-platform',       ARRAY['app.afriresell.sn'],               4, 8, 'latest', 5, 'active'),
  (9, 'ERP Interne',           'afriresell-erp',            ARRAY['erp.afriresell.sn'],               1, 3, '17.0',   5, 'deploying'),
  (10,'Site Vitrine',          'afriresell-site',           ARRAY['www.afriresell.sn'],               2, 5, '6.4',    5, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREDIT TRANSACTIONS
-- ============================================================================

INSERT INTO xayma_app.credit_transactions (id, partner_id, "transactionType", "creditsPurchased", "creditsUsed", "creditsRemaining", "amountPaid", "paymentMethod", status, created)
VALUES
  -- Teranga Solutions
  (1,  1, 'credit', 50, NULL, 50,  25000, 'wave',         'completed', NOW() - INTERVAL '30 days'),
  (2,  1, 'debit',  NULL, 5,  45,  NULL,  NULL,           'completed', NOW() - INTERVAL '15 days'),

  -- Sahel Tech
  (3,  2, 'credit', 20, NULL, 20,  10000, 'orange_money', 'completed', NOW() - INTERVAL '45 days'),
  (4,  2, 'debit',  NULL, 10, 10,  NULL,  NULL,           'completed', NOW() - INTERVAL '20 days'),
  (5,  2, 'debit',  NULL, 2,  8,   NULL,  NULL,           'completed', NOW() - INTERVAL '5 days'),

  -- DigiAfrica
  (6,  3, 'credit', 200, NULL, 200, 90000, 'wave',         'completed', NOW() - INTERVAL '60 days'),
  (7,  3, 'debit',  NULL, 70,  130, NULL,  NULL,           'completed', NOW() - INTERVAL '30 days'),
  (8,  3, 'credit', 250, NULL, 380, 100000,'wave',         'completed', NOW() - INTERVAL '15 days'),
  (9,  3, 'debit',  NULL, 60,  320, NULL,  NULL,           'completed', NOW() - INTERVAL '5 days'),

  -- Côte Sud
  (10, 4, 'credit', 100, NULL, 100, 45000, 'orange_money', 'completed', NOW() - INTERVAL '20 days'),
  (11, 4, 'debit',  NULL, 28,  72,  NULL,  NULL,           'completed', NOW() - INTERVAL '10 days'),

  -- AfriResell Pro
  (12, 5, 'credit', 500, NULL, 500, 200000,'wave',         'completed', NOW() - INTERVAL '30 days'),
  (13, 5, 'debit',  NULL, 95,  405, NULL,  NULL,           'completed', NOW() - INTERVAL '15 days'),
  (14, 5, 'debit',  NULL, 115, 290, NULL,  NULL,           'completed', NOW() - INTERVAL '5 days'),
  (15, 5, 'credit', 600, NULL, 890, 240000,'wave',         'completed', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VOUCHERS
-- ============================================================================

INSERT INTO xayma_app.vouchers (id, code, credits, max_uses, uses_count, status, expires_at)
VALUES
  (1, 'XAYMA-WELCOME-2026', 10, 100, 3,  'active',         NOW() + INTERVAL '60 days'),
  (2, 'XAYMA-PROMO-DAKAR',  25, 50,  12, 'active',         NOW() + INTERVAL '30 days'),
  (3, 'XAYMA-BETA-TEST',    50, 10,  10, 'fully_redeemed', NOW() + INTERVAL '90 days'),
  (4, 'XAYMA-EXPIRY-OLD',   10, 20,  2,  'expired',        NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SETTINGS (platform config)
-- ============================================================================

INSERT INTO xayma_app.settings (key, value)
VALUES
  ('WorkflowEngineBaseUrl',      ''),
  ('DeploymentEngineBaseUrl',    ''),
  ('CreditLowThresholdPercent',  '20'),
  ('CreditCriticalThresholdPercent', '10'),
  ('MaxDaysToArchiveDepl',       '90'),
  ('MaxDaysToArchiveOrgs',       '180'),
  ('DebitIntervalMinutes',       '15')
ON CONFLICT (key) DO NOTHING;

-- Reset sequences to avoid ID conflicts on future inserts
SELECT setval(pg_get_serial_sequence('xayma_app.control_nodes', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.control_nodes;
SELECT setval(pg_get_serial_sequence('xayma_app.services', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.services;
SELECT setval(pg_get_serial_sequence('xayma_app.serviceplans', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.serviceplans;
SELECT setval(pg_get_serial_sequence('xayma_app.partners', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.partners;
SELECT setval(pg_get_serial_sequence('xayma_app.deployments', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.deployments;
SELECT setval(pg_get_serial_sequence('xayma_app.credit_transactions', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.credit_transactions;
SELECT setval(pg_get_serial_sequence('xayma_app.vouchers', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.vouchers;
SELECT setval(pg_get_serial_sequence('xayma_app.partner_credit_purchase_options', 'id'), COALESCE(MAX(id), 1)) FROM xayma_app.partner_credit_purchase_options;

-- Re-enable audit triggers
ALTER TABLE xayma_app.partners ENABLE TRIGGER partners_audit_trigger;
ALTER TABLE xayma_app.users ENABLE TRIGGER users_audit_trigger;
