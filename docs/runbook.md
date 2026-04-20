# Operations Runbook — Xayma.sh

> Standard procedures for deployment, security, monitoring, and incident response.

---

## Security Checklist

### Credential Management

#### ✅ Supabase Anon Key (Frontend-Safe)
```typescript
// CORRECT: Included in .env and bundled
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  // PUBLIC — safe for frontend
```
- Can select/insert/update/delete via RLS policies
- Scoped to authenticated users only
- Safe to commit to `.env.example`

#### ❌ Supabase Service Role Key (Backend-Only)
```typescript
// WRONG: Never in frontend code
SUPABASE_SERVICE_ROLE_KEY=sbp_...  // PRIVATE — admin access only
```
- Bypasses RLS policies
- Must ONLY exist in n8n environment variables
- **Never commit to git, .env, .env.example, or bundle**
- Build will FAIL if detected (security check in vite.config.ts)

#### ✅ Payment Gateway API Keys (Split)
```typescript
// Public key in env (used on frontend for payment form)
VITE_PAYMENT_GATEWAY_API_KEY=pk_live_...  // PUBLIC

// Secret key in n8n environment only (webhook validation)
PAYMENT_GATEWAY_SECRET_KEY=sk_live_...    // PRIVATE — n8n only
```

#### ✅ Sentry DSN
```typescript
// Safe to include (scoped to error reporting)
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### Environment Separation

| Variable | Dev | Prod | Bundled | Notes |
|----------|-----|------|---------|-------|
| `VITE_SUPABASE_URL` | ✅ | ✅ | Yes | Project URL, public |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ | Yes | Public key, RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ❌ | Never | n8n environment only |
| `VITE_N8N_WEBHOOK_BASE_URL` | ✅ | ✅ | Yes | Webhook endpoint URL |
| `VITE_PAYMENT_GATEWAY_API_KEY` | ✅ | ✅ | Yes | Public key only |
| `PAYMENT_GATEWAY_SECRET_KEY` | ❌ | ❌ | Never | n8n environment only |
| `VITE_SENTRY_DSN` | ✅ | ✅ | Yes | Scoped to error reporting |
| `VITE_APP_ENV` | `development` | `production` | Yes | Feature flags, error detail |

---

## CI/CD Checks

### Build Security Checks
```bash
npm run build
```

Runs in this order:
1. **TypeScript Check** (`vue-tsc --noEmit`)
   - Zero `any` types
   - All types strict
   - No implicit `unknown`

2. **ESLint** (`eslint . --max-warnings 0`)
   - No console statements (except errors)
   - No hardcoded colors/pixels
   - Proper import order

3. **Service Role Key Check** (vite security plugin)
   - Fails if `SUPABASE_SERVICE_ROLE_KEY` found
   - Fails if `service.*role` pattern detected
   - Error: Clear message pointing to docs/runbook.md

4. **Bundle Size Check** (optional future)
   - Max 500KB gzipped (main bundle)
   - Tree-shaking validation

### Test Checks
```bash
npm run test:run
```
- Unit tests must pass (0 failures)
- Coverage ≥80% on business logic
- No skipped (`it.skip`) or pending tests

### Pre-Commit Validation
When you `git push`:
1. ESLint with 0 warnings
2. TypeScript type-check
3. Unit tests pass
4. Service role key NOT in output

---

## Deployment Process

### Staging → Production

1. **Build locally** (runs all checks)
   ```bash
   npm run build
   # ✅ Passes: Ready to deploy
   ```

2. **Docker build**
   ```bash
   docker build -t xayma-app:v1.0.0 .
   docker push ghcr.io/xayma-sh/xayma-app:v1.0.0
   ```

3. **Deploy to Hetzner CX32**
   ```bash
   # Via Traefik + Docker Compose
   docker-compose pull
   docker-compose up -d
   # Services restart: app.xayma.sh live
   ```

4. **Smoke tests**
   ```bash
   curl https://app.xayma.sh/
   # Check status: 200 OK
   ```

5. **Verify in Sentry**
   ```
   https://sentry.io/xayma-sh/xayma-app/
   # Look for new Release: v1.0.0
   # Check: No new errors in last 5 min
   ```

### Rollback
```bash
# Quick rollback to previous version
docker pull ghcr.io/xayma-sh/xayma-app:v0.9.9
docker-compose up -d xayma-app
# Wait 2 min for health checks
```

---

## Incident Response

### Service Down
1. Check uptime: `curl https://app.xayma.sh/`
2. Check logs: `docker logs -f xayma-app` (on CX32)
3. Check Sentry for new errors
4. Restart container: `docker-compose restart xayma-app`
5. If persists: Rollback to last known good version

### High Error Rate
1. Check Sentry dashboard for top errors
2. If recent deploy: Rollback
3. If not deployment-related: Check Supabase status
4. Investigate RLS policy changes or database issues

### Database Connectivity
1. Test Supabase: `npx supabase status`
2. Check DSN in env vars
3. Verify RLS policies (may be blocking queries)
4. Check auth.users table for user records

### Payment Failures
1. Check n8n workflow logs (credit webhooks)
2. Verify payment gateway API credentials (n8n env only)
3. Check xayma_app.transactions table for errors
4. Verify Kafka event publishing

---

## Monitoring

### Key Metrics (Datadog)
- **Uptime**: Target >99.9%
- **Error rate**: Alert if >1% for 5 min
- **Response time**: P95 <500ms
- **Deployment frequency**: Target 2–3x per week
- **MTTR**: <30 min average

### Alerts
| Alert | Threshold | Action |
|-------|-----------|--------|
| Service down | 2 min | Page oncall immediately |
| Error rate spike | >5% for 1 min | Investigate; consider rollback |
| High latency | P95 >2s | Check database queries |
| Supabase down | Any outage | Wait for status page; notify users if >15 min |
| Payment webhook failures | >10 in 5 min | Check n8n; page payment team |

### Logging
All application logs go to **Sentry** (errors) + **Datadog** (traces):
```typescript
// Error logging
Sentry.captureException(new Error('Message'))

// Event tracking
Sentry.captureMessage('User signed in', 'info')

// Performance monitoring
// (via Sentry browser tracing)
```

---

## Regular Maintenance

### Weekly
- [ ] Review Sentry for new error patterns
- [ ] Check test coverage (target: ≥80%)
- [ ] Monitor Datadog dashboards

### Monthly
- [ ] Review dependency updates (security patches)
- [ ] Audit RLS policies for any drift
- [ ] Test disaster recovery (database backup → restore)
- [ ] Review audit log for suspicious activities

### Quarterly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Load testing on expected user growth
- [ ] Retrospective on incidents (if any)

---

## Backup & Recovery

### Database Backups
Supabase handles daily backups automatically (7-day retention).

Manual backup:
```bash
# Export full database
npx supabase db dump --db-url "..." > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20260326.sql
```

### Disaster Recovery
1. **Database lost**: Restore from Supabase backup (Dashboard → Backups)
2. **App secrets lost**: Regenerate from n8n environment settings
3. **Full outage**: Re-deploy to new Hetzner instance with same code/data

---

## Feature Flags

Enable/disable features via `xayma_app.settings` table:

```typescript
// src/composables/useSettings.ts
const { data: darkModeEnabled } = await getSettingValue('feature_dark_mode')

// In UI
<Checkbox v-if="darkModeEnabled" v-model="darkMode" label="Dark mode" />
```

### Current Flags
- `feature_dark_mode` — Dark mode toggle (Sprint 8)
- `feature_reseller_commission` — Reseller commission tracker (Sprint 6, optional)
- `feature_sales_portfolio` — Sales portfolio (Sprint 7, optional)

---

## Support Contacts

| Role | Contact | Response Time |
|------|---------|----------------|
| **On-call Eng** | [PagerDuty] | 5 min |
| **Supabase Support** | support@supabase.io | 1–4 hours |
| **Payment Gateway Support** | support@paytech.sn | 2–24 hours |

---

## Document History
| Date | Version | Changes |
|------|---------|---------|
| 2026-03-26 | 1.0 | Initial runbook (Sprint 1 foundation) |
