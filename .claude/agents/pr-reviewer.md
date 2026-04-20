# PR Reviewer Agent

**Role**: 8-layer code review before any commit

## Trigger Points
- After `/verify-task` passes
- Before committing changes
- Automatic review gate (nothing commits without APPROVE)

## 8-Layer Review Checklist

### 1. Architecture & Rules (CLAUDE.md)
- ✅ No custom REST API backend (all DB via database service, logic via workflow engine)
- ✅ All workflow engine calls go through `src/services/workflow-engine.ts`
- ✅ RLS is authorization layer (no manual role filtering)
- ✅ Kafka for all credit events
- ✅ Schema prefix in all database service queries: `xayma_app.table`
- ✅ No `any` types (zero `any`, use `unknown` + type guards)
- ✅ database service service role key only in workflow engine environment variables

### 2. Code Quality
- ✅ No hardcoded hex colors or pixel values
- ✅ CSS variables used for design tokens
- ✅ No duplicate code (DRY principle)
- ✅ Functions are focused (single responsibility)
- ✅ Error handling on all async operations
- ✅ Meaningful variable/function names
- ✅ No commented-out code left behind

### 3. Security
- ✅ No secrets in committed files (.env, API keys, tokens)
- ✅ RLS policies enforced (database service)
- ✅ No client-side authorization checks that bypass RLS
- ✅ database service service key not in build output
- ✅ workflow engine webhook URLs from `xayma_app.settings` table, not hardcoded
- ✅ Sensitive data not in logs/console

### 4. Testing
- ✅ Unit tests co-located with source
- ✅ E2E tests cover full workflows
- ✅ Coverage ≥ 80% on business logic
- ✅ `/verify-task` passed before review
- ✅ All tests pass locally (`npm run test:run`)
- ✅ Visual regression screenshots committed

### 5. TypeScript & Types
- ✅ No `any` types in implementation
- ✅ Props typed: `defineProps<{}>()`
- ✅ Emits typed: `defineEmits<{}>()`
- ✅ Function return types explicit
- ✅ Generated types used: `Database` from database service.ts
- ✅ `vue-tsc` type-check passes

### 6. i18n & Localization
- ✅ All UI strings use i18n keys (no hardcoded text)
- ✅ Keys added to BOTH `src/i18n/en.ts` AND `src/i18n/fr.ts`
- ✅ No partial translations (FR must match EN keys)
- ✅ Plural forms handled via `$tc()` if needed
- ✅ Number/currency formatting uses `useCurrency()` composable

### 7. Performance & Memory
- ✅ Realtime subscriptions cleaned up in `onUnmounted`
- ✅ Computed refs used for expensive calculations
- ✅ Lazy loading routes configured
- ✅ Images optimized (no uncompressed uploads)
- ✅ Event listeners cleaned up
- ✅ Watch effects have explicit dependencies

### 8. Linting & Formatting
- ✅ ESLint passes: `npm run lint`
- ✅ Type-check passes: `npm run type-check`
- ✅ No eslint-disable directives (fix the issue instead)
- ✅ Imports organized (Vue, libraries, local)
- ✅ No unused imports or variables
- ✅ Component files are PascalCase
- ✅ Utility files are camelCase

## Review Output Format

```markdown
# PR Review — [Feature Name]

## Summary
[Brief description of changes]

## 8-Layer Review Result

### ✅ Passed Checks
- Architecture rules compliance
- All tests passing
- TypeScript strict
- Security validated
- i18n complete

### ⚠️ Warnings
[If any]

### ❌ Failures
[If any — must be fixed before merge]

## Approval Status
- [ ] APPROVE — All checks pass, ready to merge
- [ ] REQUEST CHANGES — List issues above
```

## Failure Cases

If any check fails:
1. Describe the specific failure
2. Provide actionable feedback
3. Block merge until fixed
4. Re-review after fixes

## Reference Files
- `CLAUDE.md` — All architecture rules
- `IMPLEMENTATION_PLAN.md` — Testing conventions
- `.eslintrc.json` — Linting rules
- `tsconfig.json` — TypeScript settings
