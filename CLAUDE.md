# Xayma.sh

Credit-based SaaS for web app deployment for West African SMEs. FCFA payments via Wave/Orange Money. Roles: Admin, Customer, Reseller, Sales.

- **Management app:** Vue 3 + TS SPA → `app.xayma.sh`
- **Marketing site:** Nuxt 3 + Strapi → `xayma.sh`
- **Backend:** Supabase (DB + Auth + Realtime) + n8n webhooks + Kafka (KRaft)
- **Infra:** Hetzner CX32/CX52, Docker, Traefik

## Stack

Vue 3 · Vite · TypeScript · PrimeVue 4 · Tailwind · Pinia · VeeValidate+Zod · vue-echarts · vue-i18n v11 · Supabase · n8n · Kafka · Sentry · Datadog

**PrimeVue** = all interactive components. **Tailwind** = layout, spacing, typography, responsive, dark mode.

## Commands

```
npm run dev | build | type-check | lint | lint:fix
npm run test | test:run | test:coverage | test:e2e
npm run supabase:types   # regenerates src/types/database.ts
npm run supabase:push
```

## Behavior

- State assumptions explicitly. If ambiguous, present options — don't pick silently.
- Minimum code. No unrequested features or abstractions.
- Surgical edits only. Touch only what the task requires. Match existing style.
- Every task → `/verify-task` → evidence before ✅. Multi-step tasks: state plan first.

## Architecture — NEVER VIOLATE

1. No custom REST backend. DB reads via Supabase JS SDK. Writes via `src/services/workflow-engine.ts` only.
2. Never call n8n URLs directly — always through `src/services/workflow-engine.ts`.
3. n8n handles all async ops. Vue fires-and-forgets. Status via Supabase Realtime.
4. RLS is the auth layer. Missing data → check RLS first, never add frontend role filters for security.
5. Supabase service role key lives in n8n only — never in frontend or Vite output.
6. Kafka for all credit events. Never update `partners.remainingCredits` from Vue directly.
7. Schema prefix always: `supabase.from("xayma_app.partners")` — never bare table name.
8. Role checks via composable: `const { isAdmin } = useAuth()` — never string-compare in templates.
9. All UI strings are i18n keys — add to both `en.ts` AND `fr.ts` before committing.
10. Mockups are UI source of truth — check `docs/mockups/` before any screen work.
11. Every new table needs an audit trigger → `general_audit`.
12. Always clean up Realtime: `onUnmounted(() => supabase.removeChannel(channel))`.

## Agent Routing

| Trigger                            | Agent                        |
| ---------------------------------- | ---------------------------- |
| Any UI work                        | `css-design` first           |
| Vue component / store / composable | `vue-specialist`             |
| n8n automation                     | `workflow-engine-specialist` |
| After implementation               | `test-writer`                |
| Before every commit                | `pr-reviewer` — must APPROVE |

**Flow:** `css-design → vue-specialist → workflow-engine-specialist? → test-writer → /verify-task → [type "go"] → pr-reviewer → commit`

**Lead agent:** sprint status, planning, unblocking.

## Slash Commands

`/new-feature` `/new-page` `/verify-task` `/test-sprint` `/status` `/visual-check` `/workflow-engine` `/db-migration`

## Vibe Annotations

`./scripts/vibe-annotations.sh pending|watch|resolve <id>` — server at `127.0.0.1:3846`
