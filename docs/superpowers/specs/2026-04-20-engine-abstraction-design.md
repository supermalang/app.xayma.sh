# Engine Abstraction Design

**Date:** 2026-04-20  
**Scope:** Abstract n8n, AWX, and Ansible references to generic "Workflow Engine" and "Deployment Engine"  
**Goal:** Decouple codebase from specific tool implementations for future interchangeability

---

## Executive Summary

Currently, the codebase hard-couples to **n8n** (async operations, webhooks), **AWX**, and **Ansible** (deployments). This design abstracts both behind clean service layers:

- **Workflow Engine Service** (`src/services/workflow-engine.ts`): Replaces n8n, triggers async operations
- **Deployment Engine Service** (`src/services/deployment-engine.ts`): New service wrapping AWX/Ansible provisioning

Configuration, documentation, and code references updated to use generic terminology. Allows future engine swaps without touching component/store logic.

---

## Affected Scope

### Files to Rename/Move
- `src/services/n8n.ts` → `src/services/workflow-engine.ts`

### Files with Substantial Changes
- `CLAUDE.md` — all references to "n8n", "AWX", "Ansible" → generic terms
- `src/services/settings.ts` — add getters/setters for engine URLs
- `docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md` — update backend section
- `docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md` — update infrastructure section
- All `.ts` files importing `n8n.service` → `workflow-engine.service`
- `.env.example` — rename env var
- Database migration: `xayma_app.settings` key renames

### Files with Minor Changes
- `src/i18n/en.ts`, `fr.ts` — update any UI strings mentioning n8n/AWX (verify first)
- `.claude/agents/` references in CLAUDE.md
- `.claude/commands/` references in CLAUDE.md

---

## Architecture & Design

### Service Layer Abstraction

#### Workflow Engine Service

**File:** `src/services/workflow-engine.ts`

Encapsulates all workflow engine details. Public API remains unchanged in name/signature; only internal implementation details reference the engine.

```typescript
// Public API (unchanged semantically)
export const triggerDeploymentCreation = (payload) => webhookCall(...)
export const triggerCreditTopup = (payload) => webhookCall(...)
export const triggerNotification = (payload) => webhookCall(...)
// ... etc
```

**Responsibilities:**
- Construct webhook envelopes (contract defined by engine implementation)
- Handle timeouts, retries
- Fire-and-forget semantics (async operations tracked via Supabase Realtime)
- Never blocks UI

#### Deployment Engine Service

**File:** `src/services/deployment-engine.ts` (new)

Abstracts deployment/provisioning operations currently scattered or hard-coupled to AWX.

```typescript
export const provisionInstance = (serverId: string, config: InstanceConfig) => deploymentCall(...)
export const updateInstance = (serverId: string, updates: InstanceUpdate) => deploymentCall(...)
export const deleteInstance = (serverId: string) => deploymentCall(...)
```

**Responsibilities:**
- Route deployment requests to the configured engine
- Handle authentication, retries
- Return status identifiers for Realtime tracking

### Configuration & Environment

#### Environment Variables

Rename in `.env.example`:

```bash
# Before
VITE_N8N_WEBHOOK_BASE_URL=https://n8n.xayma.sh

# After
VITE_WORKFLOW_ENGINE_BASE_URL=https://workflow-engine.xayma.sh
VITE_DEPLOYMENT_ENGINE_BASE_URL=https://deployment-engine.xayma.sh
```

Both are Vite-exposed variables (needed by frontend for webhook construction).

#### Settings Table (`xayma_app.settings`)

Database keys renamed by migration:

| Old Key | New Key |
|---------|---------|
| `n8n_webhook_base_url` | `workflow_engine_webhook_base_url` |
| `n8n_*` (any other n8n keys) | `workflow_engine_*` |
| `awx_*` (any AWX keys) | `deployment_engine_*` |

Migration is idempotent: if key doesn't exist, skip. Safe to run multiple times.

#### Service Settings Module

Update `src/services/settings.ts` to provide typed getters:

```typescript
export const getWorkflowEngineUrl = async () => getSetting('workflow_engine_webhook_base_url')
export const getDeploymentEngineUrl = async () => getSetting('deployment_engine_base_url')
```

### Documentation Updates

#### CLAUDE.md

Replace all instances:
- "n8n" → "workflow engine"
- "AWX" / "Ansible" → "deployment engine"
- "n8n webhook" → "workflow engine webhook"
- "n8n URLs" → "workflow engine URLs"

Key sections affected:
- Rule #1: "No custom REST API backend" — still accurate, mention workflow engine instead
- Rule #2: "Never call n8n URLs directly" → "Never call workflow engine URLs directly"
- Rule #3: "n8n handles all async operations" → "Workflow engine handles..."
- Rule #5: "Supabase service role key = server-side only" → mention workflow engine stores it
- Rule #6: "Kafka for all credit events" → "Flow: Vue → workflow engine webhook → Kafka → ..."
- Platform Settings section: "n8n base URL" → "workflow engine base URL"
- Agent team: remove n8n-specialist reference (or update if that agent stays)
- Slash commands: update `/n8n-workflow` → `/workflow-engine` (or similar)

#### Specifications

- **SPEC_04_TECHNICAL_ARCHITECTURE.md:** Update backend layer section to reference "workflow engine" and "deployment engine"
- **SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md:** Update infrastructure diagram/description to use deployment engine terminology

#### README & Project Overview

Update summary section if it mentions n8n/AWX explicitly.

### Data Flow (Unchanged Semantically)

```
Vue Component / Composable
  ↓
workflow-engine.ts (public API: triggerDeployment, triggerCreditTopup, etc.)
  ↓
POST /webhook/<operation>
  ↓
[Workflow Engine Implementation — n8n, Zapier, custom, etc.]
  ↓
Kafka events → Supabase updates ← Vue Realtime subscriptions

---

Vue Component / Composable
  ↓
deployment-engine.ts (public API: provisionInstance, updateInstance, deleteInstance)
  ↓
[Deployment Engine API — AWX, Ansible Tower, custom, etc.]
  ↓
Supabase updates ← Vue Realtime subscriptions
```

No logic changes; abstraction is transparent to consumers.

---

## Testing & Verification

### Unit Tests
- Update all imports: `from '@/services/n8n'` → `from '@/services/workflow-engine'`
- No logic changes; tests pass as-is

### E2E Tests
- Webhook mocks use generic endpoint names (generic, not n8n-specific)
- Deployment mocks updated to use deployment engine terminology

### Verification Checklist
- [ ] All imports updated (`find . -name '*.ts' | xargs grep 'from.*n8n'` returns nothing)
- [ ] All CLAUDE.md references replaced (no "n8n", "AWX", "Ansible" except in git history/comments)
- [ ] `.env.example` updated with new variable names
- [ ] Supabase migration applied (settings keys renamed)
- [ ] Type safety verified (TypeScript strict mode, zero `any`)
- [ ] No broken imports (type-check passes)
- [ ] `/verify-task` passes all checks

---

## Migration Path & Reversibility

### Safe Rollout
1. Rename service files, update imports
2. Rename env vars, update config
3. Rename documentation references
4. Apply Supabase migration (idempotent)
5. Run type-check, tests
6. Commit to master

### Future Engine Swaps
When switching engines (e.g., n8n → Zapier):
- Only update `src/services/workflow-engine.ts` implementation
- Update `VITE_WORKFLOW_ENGINE_BASE_URL` in `.env`
- Update `workflow_engine_webhook_base_url` in `xayma_app.settings`
- No component/store changes needed

---

## Known Considerations

- **Agent references:** `.claude/agents/n8n-specialist.md` may need updating or removal — handled as part of CLAUDE.md cleanup
- **Command references:** `.claude/commands/n8n-workflow.md` may need renaming — handled as part of cleanup
- **Backward compatibility:** Old env var names will not work; this is a breaking change for deployment scripts. Update CI/CD and `.env` files accordingly.
- **Database:** `xayma_app.settings` migration is one-way; old keys are not accessed after migration. This is safe and idempotent.

---

## Acceptance Criteria

- [ ] All references to "n8n" in code/docs replaced with "workflow engine"
- [ ] All references to "AWX"/"Ansible" replaced with "deployment engine"
- [ ] Service files renamed, all imports updated
- [ ] Environment variables and database settings renamed
- [ ] TypeScript compilation passes (strict mode)
- [ ] Unit tests pass
- [ ] E2E tests pass (or verified compatible)
- [ ] `/verify-task` passes
- [ ] Commit message references this design
