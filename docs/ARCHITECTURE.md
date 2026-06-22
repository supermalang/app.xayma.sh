# Architecture

> **[OPTIONAL — Tier-2 knowledge doc].** The deep technical reference: system shape, key
> components, data model, and the decisions behind them. It is read **when a task needs it**,
> not on every run — that's the difference from `.claude/context.md`, which stays short because
> every agent loads it each time. `.claude/context.md` holds the *operational* facts (commands,
> stack, rules); this file holds the *architectural* ones (how the system is put together and why).
> Keep the two from overlapping: when in doubt, short operational fact → `context.md`, deep
> explanation → here.
>
> **Read by:** `/coder`, `/schema-agent`, `/perf-review`, `/security-audit` (for system shape,
> data model, hot paths, and trust boundaries) and kept current by `/docs`. All treat this file
> as optional — if it's absent they fall back to `.claude/context.md`.

---

## System overview

Xayma.sh has two front ends and a shared event-driven backend:

- **Management app** — Vue 3 SPA served at `app.xayma.sh`. This repo. Where operators, customers,
  resellers, and sales do all their work.
- **Marketing site** — Nuxt 3 + Strapi served at `xayma.sh`. Separate project; not in this repo.
- **Backend** — Supabase (Postgres DB + Auth + Realtime), an n8n workflow engine, and a Kafka
  (KRaft) credit-event bus.

The app never owns business writes directly. The write path is deliberately one-directional and
asynchronous:

```
Vue component/store
  → src/services/workflow-engine.ts   (fire-and-forget POST, response not awaited)
    → n8n webhook (validates + executes business logic)
      → Kafka topic(s)               (credit.debit, credit.topup, deployment.*, notification.send)
        → n8n consumer group
          → Supabase write           (via service-role key held only in n8n)
            → Supabase Realtime change event
              → Vue subscription updates the UI to the final state
```

Reads go straight from Vue to Supabase via the JS SDK (always with the `xayma_app.` schema prefix),
scoped automatically by RLS. The status of any async operation is observed exclusively through
Supabase Realtime — never by polling or awaiting the n8n response.

> A `/diagram architecture` Mermaid diagram can be added here once the pipeline is bedded in.

## Components

- **Services layer (`src/services/`)** — two responsibilities: (1) typed Supabase reads, always
  `supabase.from("xayma_app.<table>")`; (2) `workflow-engine.ts`, the *single* entry point for any
  call to n8n. Nothing else in the app may `fetch()` an n8n URL.
- **Pinia stores (`src/stores/`)** — client state and orchestration; call services, never n8n
  directly. `notificationStore.addError(t(...))` is the standard channel for user-visible errors.
- **Composables (`src/composables/`)** — shared logic, notably `useAuth()` for all role checks
  (`isAdmin`, etc.). Templates never string-compare roles.
- **RLS policies (Supabase)** — the actual authorization layer. Every query is scoped by
  `auth.uid()` → `users.company_id`. Realtime requires RLS enabled on the subscribed table.
- **Settings (`xayma_app.settings`)** — platform config (n8n URLs, webhook paths, credit
  thresholds, external service config) as key/value rows. Read via `src/services/settings.ts` /
  `useSettings()`. Never hardcoded.
- **n8n workflow engine** — owns all async ops and is the *only* Kafka producer. Holds the
  Supabase service-role key and all third-party secrets in its environment.
- **Kafka (KRaft)** — credit/deployment/notification event bus. External dependency (separate
  project); this app only triggers n8n webhooks, it never produces to Kafka.

## Key technical decisions

- **RLS as the auth layer** · centralizes tenant isolation in the database so it cannot be bypassed
  by a forgotten frontend filter · trade-off: missing data must be debugged at the policy level,
  not in app code.
- **No custom REST backend** · reads via Supabase SDK, writes via n8n, so there is no bespoke API
  surface to maintain or secure · trade-off: all write logic lives in n8n, not in versioned app code.
- **Fire-and-forget n8n + Realtime status** · the SPA stays responsive and decoupled from slow async
  work · trade-off: no synchronous success/error return; the UI must handle the "pending until
  Realtime confirms" state explicitly.
- **Kafka for credit events** · ordered, replayable, idempotent credit mutations (debit / topup /
  expiry / suspension) · trade-off: added infrastructure and eventual-consistency reasoning.
- **Schema-prefixed Supabase queries (`xayma_app.`)** · explicit schema avoids ambiguity and
  accidental cross-schema reads · trade-off: every query string must carry the prefix; a bare table
  name is a bug.

---

## Key constraint: data isolation

The isolation key is **`company_id`**. Every tenant-scoped row carries it, and every query is
constrained to the caller's company.

- **Where it comes from:** `auth.uid()` (the Supabase Auth user id) resolves to `users.company_id`
  inside the RLS policies. It is *derived server-side from the session*, never taken from the request
  body or a query parameter.
- **The rule:** never add a manual `where company_id = x` filter in app code. RLS does the scoping;
  a hand-written filter is at best redundant and at worst a false sense of security that masks a
  missing policy. Missing data → check the RLS policy first.
- **Realtime:** a table must have RLS enabled before it can be subscribed to via Supabase Realtime,
  otherwise the channel leaks cross-tenant changes.

**Rationale:** putting isolation in the database means it holds regardless of which code path
reaches the data — a forgotten filter in a new store or service cannot widen access.

**Edge case — IPN before redirect:** the payment provider's IPN (server-to-server callback for
Wave / Orange Money) frequently arrives *before* the user is redirected back to the app. The credit
top-up must therefore be **idempotent**: the consumer checks the current payment/transaction status
before applying the top-up, so the IPN and any redirect-driven processing can race without
double-crediting. (Operational summary also lives in `.claude/context.md`; the rationale and edge
cases live here.)

## Auth flow

Auth is handled by **Supabase Auth**. The session (a JWT carrying `auth.uid()`) is established by
the Supabase JS client and stored client-side. App code never reads roles or company from the
request — it derives them from the session:

- **Role checks:** always via the `useAuth()` composable (`isAdmin`, etc.). Never string-compare
  roles in templates or stores.
- **Tenant scope:** server-side, RLS maps `auth.uid()` → `users.company_id` for every query.
- **Service-role key:** the elevated Supabase key lives only in the n8n environment, never in the
  frontend or the Vite build output.

## Standard read / write patterns

```ts
// READ — Supabase SDK, always the xayma_app. schema prefix; RLS scopes by company_id.
const { data, error } = await supabase.from("xayma_app.partners").select("*");
if (error) { notificationStore.addError(t("errors.fetch_failed")); return; }

// WRITE — never write business data directly. Fire-and-forget through the workflow engine.
import { triggerWorkflow } from "@/services/workflow-engine";
triggerWorkflow("deployment.create", payload); // response not awaited
// → n8n validates, publishes to Kafka, consumer writes to Supabase
// → UI reflects the change via a Supabase Realtime subscription

// REALTIME — always clean up.
const channel = supabase.channel("x").on("postgres_changes", { /* ... */ }, cb).subscribe();
onUnmounted(() => supabase.removeChannel(channel));
```

---

## Data model / schema reference

**[CONFIGURE]** — link to your schema cheatsheet or summarise key models here. Refresh the ERD
with `/diagram erd` whenever the model changes shape.

## Trust boundaries

**[CONFIGURE]** — where untrusted input enters the system (user input, uploads, third-party
webhooks, inter-service calls). `/security-audit` uses this to focus its review.

## Performance-sensitive paths

**[CONFIGURE]** — the hot paths and scale assumptions (expected row counts, traffic shape) that
`/perf-review` and `/perf-measure` should weigh changes against.
