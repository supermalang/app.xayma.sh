# Mock Workflow Engine

Dev-runtime mock layer for workflow-engine (n8n) operations. When `VITE_MOCK_WORKFLOW_ENGINE=true` (or localStorage `xayma:mock-workflow-engine=true`), calls to `callWorkflowEngineWebhook` / `callDeploymentEngineWebhook` / `callContainerEngineWebhook` are routed through handlers in `operations/` instead of HTTP.

Each handler returns the same envelope shape the real workflow engine would AND performs the Supabase side-effects (insert/update transactions, bump partner balance, etc.) so the UI's existing Realtime subscriptions just work.

**Production guard:** `index.ts` throws at module init if `import.meta.env.PROD` AND the env flag is `true`. No silent fallback.

## How the toggle resolves

Highest priority first:

1. **localStorage** `xayma:mock-workflow-engine` = `'true'` | `'false'`
2. **env** `VITE_MOCK_WORKFLOW_ENGINE` = `'true'` | `'false'`
3. **default** `false`

`isMockEnabled()` reads these on every call (no caching) so the Settings page toggle flips behavior immediately.

## How dispatch works

`callEngineInternal` in `src/services/workflow-engine.ts` is the only chokepoint:

```typescript
if (isMockEnabled()) {
  const handler = lookupMockHandler(engine, operation)
  if (handler) {
    const ctx = await buildMockContext()
    const result = await handler(payload, ctx)
    return (parseResponse ? result : undefined) as T
  }
  // Fall through to real HTTP if no mock registered (partial mocking is OK)
}
```

The fall-through is intentional: you can mock just the unimplemented operations and let the rest hit real n8n.

## Adding a new operation

1. Create `operations/<name>.mock.ts`.
2. At the bottom, call `registerMock('workflow', '<operation>', handler)` (or `'deployment'` / `'container'`).
3. Add `import './operations/<name>.mock'` to `registry.ts`.
4. Write a colocated `<name>.mock.test.ts`.

Match the real workflow-engine envelope shape so the typed wrappers in `services/workflow-engine.ts` unwrap correctly.

## Settings dev tools

Admin users see a "Dev tools" section in `/settings` when `import.meta.env.DEV` OR mock mode is on. It exposes:

- A toggle that writes to localStorage (takes precedence over the env flag).
- A "Run credit deduction now" button that simulates the 15-minute n8n cron once.

## When the real workflow exists

Delete the mock file and remove its registry import. The dispatcher falls through to real HTTP automatically for any operation with no registered mock.
