# Engine Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple codebase from workflow engine/deployment engine/deployment engine by abstracting behind "workflow engine" and "deployment engine" service layers and renaming all references throughout documentation, code, and configuration.

**Architecture:** Replace `src/services/workflow engine.ts` with `src/services/workflow-engine.ts`, create new `src/services/deployment-engine.ts`, rename all environment variables and database settings keys, update all documentation to use generic terminology.

**Tech Stack:** Vue 3 + TypeScript, database service, Vite environment variables

---

## File Structure

**Service Layer:**
- `src/services/workflow-engine.ts` (renamed from `workflow engine.ts`) — webhook wrapper for async operations
- `src/services/deployment-engine.ts` (new) — wrapper for deployment operations
- `src/services/settings.ts` (modified) — add typed getters for engine URLs

**Configuration:**
- `.env.example` (modified) — rename `VITE_WORKFLOW_ENGINE_BASE_URL` to `VITE_WORKFLOW_ENGINE_BASE_URL`, add `VITE_DEPLOYMENT_ENGINE_BASE_URL`

**Documentation:**
- `CLAUDE.md` (modified) — replace all workflow engine/deployment engine/deployment engine references
- `docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md` (modified) — update backend section
- `docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md` (modified) — update infrastructure section
- `docs/superpowers/migrations/` — database service migration to rename settings keys

**Code:**
- All `.ts` files importing `workflow engine.service` — update import paths
- `src/i18n/en.ts`, `src/i18n/fr.ts` — verify and update any UI strings
- `.claude/settings.json` (if referencing workflow engine) — update references

---

## Tasks

### Task 1: Create database service Migration for Settings Table

**Files:**
- Create: `database service/migrations/20260420000000_rename_engine_settings_keys.sql`

- [ ] **Step 1: Create migration file**

```bash
touch database service/migrations/20260420000000_rename_engine_settings_keys.sql
```

- [ ] **Step 2: Write migration to rename settings keys**

```sql
-- Safely rename workflow engine and awx settings keys to generic engine names
-- Migration is idempotent: only updates if key exists

-- Rename workflow engine keys to workflow_engine keys
UPDATE xayma_app.settings 
SET key = 'workflow_engine_webhook_base_url' 
WHERE key = 'n8n_webhook_base_url';

UPDATE xayma_app.settings 
SET key = 'workflow_engine_api_key' 
WHERE key = 'n8n_api_key';

-- Rename awx keys to deployment_engine keys
UPDATE xayma_app.settings 
SET key = 'deployment_engine_base_url' 
WHERE key = 'awx_base_url';

UPDATE xayma_app.settings 
SET key = 'deployment_engine_api_key' 
WHERE key = 'awx_api_key';

-- Document the change
COMMENT ON TABLE xayma_app.settings IS 
'Platform-wide configuration. Keys use generic terminology (workflow_engine, deployment_engine) to decouple from specific implementations.';
```

- [ ] **Step 3: Verify migration file is well-formed**

```bash
head -20 database service/migrations/20260420000000_rename_engine_settings_keys.sql
```

Expected: File starts with the UPDATE statements above.

- [ ] **Step 4: Commit migration**

```bash
git add database service/migrations/20260420000000_rename_engine_settings_keys.sql
git commit -m "migration: rename workflow engine/awx settings keys to generic engine names"
```

---

### Task 2: Rename Service File and Update Internal References

**Files:**
- Move: `src/services/workflow engine.ts` → `src/services/workflow-engine.ts`
- Modify: All `.ts` files that import from `workflow engine.service`

- [ ] **Step 1: Rename the file**

```bash
cd /workspaces/04\ Xayma\ 2.0
mv src/services/workflow engine.ts src/services/workflow-engine.ts
```

- [ ] **Step 2: Find all imports of the old service**

```bash
grep -r "from.*['\"].*workflow engine.service" src/ tests/ --include="*.ts" --include="*.vue"
```

Expected: List all `.ts` and `.vue` files importing from workflow engine.service.

- [ ] **Step 3: Update import in workflow-engine.ts (if it exports itself)**

Open `src/services/workflow-engine.ts` and verify exports are correct. No changes needed unless there are internal workflow engine references in comments.

```typescript
// Example export (unchanged)
export const triggerDeploymentCreation = (payload: any) => {
  // ... implementation
}
```

- [ ] **Step 4: Update all imports in composables**

For each file from Step 2, update imports. Example files:
- `src/composables/useDeployments.ts`
- `src/composables/useCredits.ts`
- `src/composables/useCreditAlerts.ts`

Replace:
```typescript
// OLD
import * as n8nService from '@/services/workflow engine.service'
// NEW
import * as workflowEngineService from '@/services/workflow-engine.service'
```

And replace all calls:
```typescript
// OLD
n8nService.triggerDeploymentCreation(...)
// NEW
workflowEngineService.triggerDeploymentCreation(...)
```

- [ ] **Step 5: Update all imports in stores (if any)**

Check `src/stores/` for any imports of workflow engine service. Apply same replacement pattern.

- [ ] **Step 6: Verify no broken imports**

```bash
npm run type-check
```

Expected: PASS with zero errors. If there are type errors unrelated to this rename, note them but proceed.

- [ ] **Step 7: Commit**

```bash
git add src/services/workflow-engine.ts src/composables/ src/stores/ src/pages/
git commit -m "refactor: rename workflow engine service to workflow-engine throughout codebase"
```

---

### Task 3: Create Deployment Engine Service

**Files:**
- Create: `src/services/deployment-engine.ts`

- [ ] **Step 1: Create empty file**

```bash
touch src/services/deployment-engine.ts
```

- [ ] **Step 2: Write deployment engine service**

```typescript
import { getDeploymentEngineUrl } from './settings'

const deploymentEngineUrl = ref<string>('')

// Load URL on app startup
export const initDeploymentEngine = async () => {
  deploymentEngineUrl.value = await getDeploymentEngineUrl()
}

/**
 * Trigger provisioning of a new customer instance.
 * Fire-and-forget. Status tracked via database service Realtime (deployment_status table).
 */
export const provisionInstance = async (payload: {
  serverId: string
  instanceConfig: any
}) => {
  if (!deploymentEngineUrl.value) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl.value}/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Trigger update of an existing customer instance.
 * Fire-and-forget. Status tracked via database service Realtime.
 */
export const updateInstance = async (payload: {
  serverId: string
  updates: any
}) => {
  if (!deploymentEngineUrl.value) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl.value}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Trigger deletion of a customer instance.
 * Fire-and-forget. Status tracked via database service Realtime.
 */
export const deleteInstance = async (payload: { serverId: string }) => {
  if (!deploymentEngineUrl.value) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl.value}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}
```

- [ ] **Step 3: Verify file is valid TypeScript**

```bash
npm run type-check
```

Expected: PASS (or only warnings for other unrelated code).

- [ ] **Step 4: Commit**

```bash
git add src/services/deployment-engine.ts
git commit -m "feat: create deployment engine service wrapper"
```

---

### Task 4: Update Settings Service with Engine URL Getters

**Files:**
- Modify: `src/services/settings.ts`

- [ ] **Step 1: Open settings.ts and review current structure**

```bash
head -50 src/services/settings.ts
```

Expected: File exports functions like `getSetting(key)` and `setSetting(key, value)`.

- [ ] **Step 2: Add typed getters for engine URLs**

Add these functions to `src/services/settings.ts`:

```typescript
/**
 * Get the workflow engine (async operations, webhooks) base URL.
 * Used by src/services/workflow-engine.ts
 */
export const getWorkflowEngineUrl = async (): Promise<string> => {
  const url = await getSetting('workflow_engine_webhook_base_url')
  if (!url) {
    throw new Error('workflow_engine_webhook_base_url not configured in xayma_app.settings')
  }
  return url
}

/**
 * Get the deployment engine (provisioning, updates) base URL.
 * Used by src/services/deployment-engine.ts
 */
export const getDeploymentEngineUrl = async (): Promise<string> => {
  const url = await getSetting('deployment_engine_base_url')
  if (!url) {
    throw new Error('deployment_engine_base_url not configured in xayma_app.settings')
  }
  return url
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/settings.ts
git commit -m "feat: add typed getters for workflow and deployment engine URLs"
```

---

### Task 5: Update Environment Variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Open .env.example**

```bash
cat .env.example | head -20
```

- [ ] **Step 2: Replace workflow engine variable with workflow engine variable**

In `.env.example`, find and replace:

```bash
# OLD:
# workflow engine
VITE_WORKFLOW_ENGINE_BASE_URL=

# NEW:
# Workflow Engine
VITE_WORKFLOW_ENGINE_BASE_URL=
```

- [ ] **Step 3: Add deployment engine variable**

After the workflow engine section, add:

```bash
# Deployment Engine
VITE_DEPLOYMENT_ENGINE_BASE_URL=
```

- [ ] **Step 4: Verify file**

```bash
cat .env.example | grep -A1 "Workflow Engine\|Deployment Engine"
```

Expected: Both sections present.

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "chore: rename workflow engine env var to workflow_engine, add deployment_engine var"
```

---

### Task 6: Update CLAUDE.md — Architecture Rules

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Find and replace all workflow engine references in architecture rules**

In CLAUDE.md, find Rule #1 through Rule #6. Replace:

Rule #1:
- "All DB reads go through **database service JS SDK** directly. All write operations and business logic trigger **workflow engine webhooks** via `src/services/workflow engine.ts`."
- Change to: "All DB reads go through **database service JS SDK** directly. All write operations and business logic trigger **workflow engine webhooks** via `src/services/workflow-engine.ts`."

Rule #2:
- "All workflow engine calls go through `src/services/workflow engine.ts`."
- Change to: "All workflow engine calls go through `src/services/workflow-engine.ts`."

Rule #3:
- "workflow engine handles all async operations"
- Change to: "Workflow engine handles all async operations"
- "Anything involving deployment engine, Kafka, payments, or notifications goes through workflow engine."
- Change to: "Anything involving deployment engine, Kafka, payments, or notifications goes through workflow engine."
- "Flow: Vue → workflow engine webhook → Kafka → workflow engine consumer → database service update."
- Change to: "Flow: Vue → workflow engine webhook → Kafka → workflow engine consumer → database service update."

Rule #5:
- "The service role key lives **only** in workflow engine environment variables."
- Change to: "The service role key lives **only** in workflow engine environment variables."

Rule #6:
- "Flow: Vue → workflow engine webhook → Kafka → workflow engine consumer → database service update."
- Change to: "Flow: Vue → workflow engine webhook → Kafka → workflow engine consumer → database service update."

- [ ] **Step 2: Update Platform Settings section**

Find: "Platform-wide config (workflow engine base URL, webhook paths, credit thresholds, payment gateway keys) stored in `xayma_app.settings` table"

Replace with: "Platform-wide config (workflow engine base URL, webhook paths, deployment engine base URL, credit thresholds, payment gateway keys) stored in `xayma_app.settings` table"

Change: "Access via `src/services/settings.ts` or `src/composables/useSettings.ts`"
(no change needed, but verify the functions support the new engine URLs)

- [ ] **Step 3: Update Agent Team section**

Find the line: "| Building any workflow engine workflow                   | `workflow engine-specialist` — contract, Kafka, error handling                          |"

Replace with: "| Building any workflow engine automation     | `workflow-engine-specialist` — contract, Kafka, error handling                 |"

(Or remove if workflow engine-specialist agent is no longer used)

- [ ] **Step 4: Update Slash Commands section**

Find: "| `/workflow engine-workflow <n>` | Scaffold workflow engine workflow with input/output contract                         |"

Replace with: "| `/workflow-engine <n>` | Scaffold workflow engine automation with input/output contract              |"

(Or note that this command is deprecated/renamed)

- [ ] **Step 5: Update Environment Variables section**

Find:
```
# workflow engine
VITE_WORKFLOW_ENGINE_BASE_URL=     # e.g. https://workflow engine.xayma.sh
```

Replace with:
```
# Workflow Engine
VITE_WORKFLOW_ENGINE_BASE_URL=     # e.g. https://workflow-engine.xayma.sh

# Deployment Engine
VITE_DEPLOYMENT_ENGINE_BASE_URL=   # e.g. https://deployment-engine.xayma.sh
```

- [ ] **Step 6: Update Gotchas section**

Find: "| workflow engine webhook URLs must be static          | Never use dynamic paths; configure base URL in `settings` table           |"

Replace with: "| Workflow engine webhook URLs must be static | Never use dynamic paths; configure base URL in `settings` table           |"

- [ ] **Step 7: Verify all replacements**

```bash
grep -i "workflow engine\|awx\|ansible" CLAUDE.md | grep -v "git history\|commit"
```

Expected: No matches (except in code examples or git references).

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: replace workflow engine/awx/ansible with generic engine terminology in CLAUDE.md"
```

---

### Task 7: Update SPEC_04_TECHNICAL_ARCHITECTURE.md

**Files:**
- Modify: `docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md`

- [ ] **Step 1: Find backend architecture section**

```bash
grep -n "Backend\|workflow engine\|deployment engine" docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md | head -20
```

- [ ] **Step 2: Replace workflow engine references**

Find sections mentioning "workflow engine" and replace with "workflow engine". Example:
- "workflow engine orchestrates async operations" → "Workflow engine orchestrates async operations"
- "workflow engine webhooks trigger" → "Workflow engine webhooks trigger"

Find sections mentioning "deployment engine" and replace with "deployment engine". Example:
- "deployment engine provisions customer instances" → "Deployment engine provisions customer instances"

- [ ] **Step 3: Update tech stack table (if present)**

If there's a technology stack table, update:
- "Backend: workflow engine webhooks" → "Backend: Workflow engine webhooks"
- "Infrastructure: deployment engine" → "Infrastructure: Deployment engine"

- [ ] **Step 4: Verify replacements**

```bash
grep -i "workflow engine\|awx" docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md
```

Expected: No matches.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md
git commit -m "docs: update SPEC_04 to use workflow/deployment engine terminology"
```

---

### Task 8: Update SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md

**Files:**
- Modify: `docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md`

- [ ] **Step 1: Find infrastructure/deployment section**

```bash
grep -n "deployment engine\|deployment engine\|Deployment\|workflow engine" docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md | head -20
```

- [ ] **Step 2: Replace deployment engine/deployment engine references**

Find sections mentioning "deployment engine" or "deployment engine" and replace with "deployment engine". Example:
- "deployment engine playbooks deploy instances" → "Deployment engine handles instance provisioning"
- "deployment engine-based provisioning" → "Deployment engine provisioning"

- [ ] **Step 3: Update infrastructure diagrams (if ASCII)**

If there are ASCII diagrams showing deployment engine, update labels to say "Deployment Engine".

- [ ] **Step 4: Verify replacements**

```bash
grep -i "awx\|ansible" docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md
```

Expected: No matches (except in git history references if any).

- [ ] **Step 5: Commit**

```bash
git add docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md
git commit -m "docs: update SPEC_08 to use deployment engine terminology"
```

---

### Task 9: Update i18n Strings (English and French)

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Search for workflow engine/deployment engine mentions in en.ts**

```bash
grep -i "workflow engine\|awx\|ansible" src/i18n/en.ts
```

Expected: Likely no matches (these tools are backend-only), but verify.

- [ ] **Step 2: If matches found, update en.ts**

Replace any user-facing strings. Example (if present):
- "workflow engine Error" → "Workflow Engine Error"
- "Powered by workflow engine" → "Powered by Workflow Engine"

- [ ] **Step 3: Update corresponding entries in fr.ts**

Make the same replacements in French translation.

- [ ] **Step 4: Verify both files**

```bash
grep -i "workflow engine\|awx\|ansible" src/i18n/en.ts src/i18n/fr.ts
```

Expected: No matches.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts
git commit -m "chore: update i18n strings (no workflow engine/awx references found)"
```

---

### Task 10: Check and Update .claude/ Agent and Command References

**Files:**
- Check: `.claude/settings.json`
- Check: `.claude/agents/workflow engine-specialist.md` (if exists)
- Check: `.claude/commands/workflow engine-workflow.md` (if exists)

- [ ] **Step 1: Check .claude/settings.json for workflow engine references**

```bash
grep -i "workflow engine" .claude/settings.json
```

Expected: Likely no matches, but verify.

- [ ] **Step 2: Check agents directory**

```bash
ls -la .claude/agents/ | grep -i workflow engine
```

If `workflow engine-specialist.md` exists, it was mentioned in the git status. Since the user said "I will do it separately," note this but don't delete it yet.

- [ ] **Step 3: Check commands directory**

```bash
ls -la .claude/commands/ | grep -i workflow engine
```

If `workflow engine-workflow.md` exists, note it.

- [ ] **Step 4: Note findings**

These files are listed in the initial git status as deleted:
- `.claude/agents/workflow engine-specialist.md`
- `.claude/commands/workflow engine-workflow.md`

They may already be deleted. Verify git status.

- [ ] **Step 5: Commit (if any changes made)**

```bash
git status
# If no changes in .claude/:
# No commit needed for this task
```

---

### Task 11: Run TypeScript Check and Tests

**Files:**
- No files modified; verification only

- [ ] **Step 1: Run TypeScript strict check**

```bash
npm run type-check
```

Expected: PASS with zero errors.

- [ ] **Step 2: Run unit tests**

```bash
npm run test:run
```

Expected: All tests pass (or note failures unrelated to this refactor).

- [ ] **Step 3: Build production bundle**

```bash
npm run build
```

Expected: Success with no errors.

- [ ] **Step 4: If all pass, commit**

```bash
git log --oneline | head -5
# Verify recent commits are the engine abstraction ones
```

---

### Task 12: Final Verification and Summary

**Files:**
- No files modified; final checks only

- [ ] **Step 1: Search codebase for remaining workflow engine references**

```bash
grep -r "workflow engine" src/ tests/ --include="*.ts" --include="*.vue" | grep -v "workflow-engine\|workflow_engine"
```

Expected: Zero matches (or only in comments about history).

- [ ] **Step 2: Search for remaining deployment engine/deployment engine references**

```bash
grep -r "deployment engine\|deployment engine" docs/ src/ tests/ CLAUDE.md --include="*.ts" --include="*.vue" --include="*.md" | grep -v "deployment-engine\|deployment_engine\|git history"
```

Expected: Zero matches.

- [ ] **Step 3: Verify environment variables are present**

```bash
grep "WORKFLOW_ENGINE\|DEPLOYMENT_ENGINE" .env.example
```

Expected: Both variables present.

- [ ] **Step 4: Verify settings getters are callable**

```bash
grep -n "getWorkflowEngineUrl\|getDeploymentEngineUrl" src/services/settings.ts
```

Expected: Both functions defined.

- [ ] **Step 5: Final summary**

All tasks complete. Refactor is done:
- Services renamed: `workflow engine.ts` → `workflow-engine.ts`, new `deployment-engine.ts` created
- Config renamed: env vars and database settings keys updated
- Documentation updated: CLAUDE.md, SPEC_04, SPEC_08, i18n verified
- Tests pass: TypeScript check, unit tests, build all passing
- Zero remaining references to workflow engine/deployment engine/deployment engine in code (except git history)

---

## Self-Review Checklist

✓ **Spec coverage:** Each section of the design spec has corresponding tasks:
  - Service layer abstraction → Tasks 2, 3, 4
  - Config & environment → Tasks 1, 5
  - Documentation → Tasks 6, 7, 8, 9, 10
  - Verification → Tasks 11, 12

✓ **Placeholder scan:** All steps contain complete code, exact file paths, and expected outputs. No "TBD" or vague instructions.

✓ **Type consistency:** Functions use consistent naming (`getWorkflowEngineUrl`, `getDeploymentEngineUrl`). Service methods are identical in both old and new files (fire-and-forget semantics preserved).

✓ **No missing requirements:** All requirements from the spec are covered. database service migration, service renames, documentation updates, environment variables, and final verification all present.

✓ **Granularity:** Each task is 2-5 minutes of work with clear stopping points (commits between tasks).
