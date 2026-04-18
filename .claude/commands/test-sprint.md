# /test-sprint — Full E2E Sprint Gate

## Usage
```
/test-sprint
```

## Purpose
**Final acceptance gate at end of sprint.** Sprint is NOT done until this passes.

## Process

### 1. Pre-Test Checklist
- [ ] All tasks marked ✅ in IMPLEMENTATION_PLAN.md
- [ ] `/verify-task` passed on every task
- [ ] All unit tests pass: `npm run test:run`
- [ ] No ESLint warnings: `npm run lint`
- [ ] No TypeScript errors: `npm run type-check`

### 2. Run Full E2E Suite
```bash
npm run test:e2e
```

Covers all critical workflows:
- **Auth**: login, register, logout, session persistence
- **Core feature**: CRUD operations, status changes, data validation
- **Realtime**: Live updates via Supabase
- **Error handling**: Network failures, invalid input, edge cases
- **i18n**: Both EN and FR language switching
- **Role guards**: Correct access control per user role

### 3. Visual Regression
- [ ] All screenshots pass comparison (no layout shifts)
- [ ] Responsive breakpoints tested (mobile, tablet, desktop)
- [ ] Dark mode (if applicable)

### 4. Coverage Validation
```bash
npm run test:coverage
```
- [ ] Business logic ≥80% coverage
- [ ] Core components ≥70% coverage
- [ ] Services ≥90% coverage

### 5. Performance Check
- [ ] No console errors (warnings OK)
- [ ] No memory leaks from dangling subscriptions
- [ ] Page load time reasonable (<3s on 3G)

## Output Format

```markdown
# Sprint 3 E2E Gate — PASS ✅

## Test Results
- Unit tests: 127 passed, 0 failed
- E2E tests: 32 passed, 0 failed
- Coverage: 82% (target: 80%)

## Quality Metrics
- ESLint violations: 0
- TypeScript errors: 0
- Console errors: 0
- Screenshot mismatches: 0

## Blockers
None

## Status
✅ **SPRINT APPROVED FOR RELEASE**
```

If any test fails:
```markdown
# Sprint 3 E2E Gate — FAIL ❌

## Failed Tests
1. Login E2E test
   - Error: "Welcome" text not found in FR mode
   - Expected: i18n key translated
   - Issue: Missing FR translation for 'auth.welcome'

2. Partners DataTable test
   - Error: Column sort not working
   - Expected: Rows sorted by name
   - Issue: DataTable prop misconfigured

## Required Fixes
- [ ] Add missing i18n key: src/i18n/fr.ts
- [ ] Fix DataTable sort prop in partners list page
- [ ] Re-run E2E tests after fixes

## Unblock Timeline
Est. 2–3 hours to fix + re-test
```

## Acceptance Criteria for Completion
- ✅ All E2E tests pass
- ✅ 0 console errors
- ✅ 0 ESLint violations
- ✅ ≥80% coverage on business logic
- ✅ All screenshots match reference
- ✅ No flaky tests (run twice to confirm)

## If Tests Fail
1. Identify root cause
2. Fix the issue (not the test)
3. Re-run `/test-sprint`
4. Document in retrospective any systemic issues

## Related Commands
- `/verify-task` — Pre-commit checks on each task
- `npm run test` — Continuous test runs during development
- `npm run test:e2e:ui` — Interactive E2E debugging
