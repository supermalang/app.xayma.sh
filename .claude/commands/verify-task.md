# /verify-task — Self-Check Task Implementation

## Usage
```
/verify-task
```

## Purpose
**Before every approval gate**, Claude verifies its own implementation against the task checklist.

## Verification Checklist

### Code Quality
- [ ] ESLint passes: `npm run lint` (no warnings)
- [ ] Type-check passes: `npm run type-check` (no errors)
- [ ] No `any` types in code (strict TypeScript)
- [ ] No hardcoded colors/pixels (design tokens only)

### Architecture Compliance (CLAUDE.md)
- [ ] Supabase queries prefixed with `xayma_app.`
- [ ] All workflow engine calls go through `src/services/workflow-engine.ts`
- [ ] RLS policies checked (not manual role filtering)
- [ ] Realtime subscriptions cleaned up in `onUnmounted`
- [ ] No Supabase service role key in frontend code

### Implementation Pattern
- [ ] Vue components use `<script setup>` (no Options API)
- [ ] Props typed: `defineProps<{}>()`
- [ ] Emits typed: `defineEmits<{}>()`
- [ ] Stores use Pinia with actions
- [ ] Composables return typed objects

### i18n Completeness
- [ ] All UI strings use i18n keys (no hardcoded text)
- [ ] Keys added to `src/i18n/en.ts`
- [ ] Keys added to `src/i18n/fr.ts`
- [ ] No missing translations (EN/FR parity)

### Testing (Per-Task)
- [ ] Unit tests pass: `npm run test:run`
  - All Supabase, workflow engine calls mocked via `vi.mock()`
  - Use typed fixtures from `tests/fixtures/`
- [ ] Unit test coverage ≥80% on business logic
- [ ] Coverage report: `npm run test:coverage`
- **Note:** E2E tests run only at sprint end via `/test-sprint`, not per-task

### Documentation
- [ ] Code comments on non-obvious logic only
- [ ] Function signatures include types
- [ ] Component props documented in JSDoc (if complex)

## Output Format

```markdown
# Verification Report — [Task Name]

## Code Quality
✅ ESLint: PASS
✅ Type-check: PASS
✅ No hardcoded values: PASS

## Architecture
✅ Supabase schema prefix: PASS
✅ workflow engine service usage: PASS
✅ RLS policies: PASS

## Testing (Per-Task)
✅ Unit tests: PASS (coverage: 85%, all mocked)
✅ No E2E requirement (runs at sprint end only)

## Result
✅ **READY FOR REVIEW** — All checks pass
```

If any check fails:
```markdown
## Result
❌ **NOT READY** — Fix issues below:
1. Unit test coverage 72% (need ≥80%)
   - Run: npm run test:coverage
2. Missing mock for supabase.from() in auth.store.test.ts
   - Use: vi.mock('@/services/supabase')
   - Import fixture: import { mockUser } from 'tests/fixtures'
```

## Next Steps
- If READY: Await PR review (type "go")
- If NOT READY: Fix issues, re-run `/verify-task`

## Related Commands
- `/test-sprint` — Full E2E gate at sprint end
- `npm run test` — Run tests in watch mode
- `npm run test:coverage` — Check coverage
