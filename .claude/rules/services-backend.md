---
description: n8n, Kafka, Supabase service layer rules
globs: src/services/**/*.ts
---

## workflow-engine.ts

All n8n calls must go through this file. Pattern: fire-and-forget POST, no awaited response.
Status is tracked exclusively via Supabase Realtime, never by polling or awaiting webhook responses.

## settings.ts

Platform config (n8n URLs, webhook paths, credit thresholds, payment keys) lives in `xayma_app.settings` table.
Access via `src/services/settings.ts` or `useSettings()`. Never hardcode these values anywhere.

## Credit Events

All credit mutations (debit, topup, expiry, suspension) must flow through Kafka.
Flow: Vue → n8n webhook → Kafka → n8n consumer → Supabase update.
Never update `partners.remainingCredits` directly from any frontend code or service.

## Environment Variables

```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
SUPABASE_PROJECT_ID          # supabase:types only
VITE_WORKFLOW_ENGINE_BASE_URL
VITE_DEPLOYMENT_ENGINE_BASE_URL
VITE_PAYMENT_GATEWAY_API_KEY # public key only — secret lives in n8n env
VITE_SENTRY_DSN / VITE_APP_ENV
```

Never commit `.env`. Use `.env.example` for documentation only.

## Supabase Service Role Key

Lives ONLY in n8n environment variables. Never reference in any file under `src/`.

## Auth / RLS

- Role checks via `useAuth()` composable only.
- All queries are scoped by RLS using `auth.uid()` → `users.company_id`.
- Never add manual `where company_id = x` filters — RLS handles it.

## Gotchas

- Phone validation (West Africa): `^(70|75|76|77|78)[0-9]{7}$`
- Payment IPN arrives before UI redirect — credit update must be idempotent, check status before processing.
- Domain validation uses DB function `valid_domain_array()` — do not replicate in JS.
- Supabase Realtime requires RLS enabled on all realtime tables.
- Kafka KRaft requires `KAFKA_NODE_ID` set in docker-compose.
