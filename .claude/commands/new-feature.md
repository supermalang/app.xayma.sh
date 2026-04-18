# /new-feature — Add Feature End-to-End

## Usage
```
/new-feature 4.5
```

## Workflow
This command scaffolds a complete feature end-to-end:

1. **css-design agent**: Token mapping, component selection
2. **vue-specialist agent**: Architecture review
3. **Implementation**: Type definitions, store, composable, component, page
4. **test-writer agent**: Unit tests, E2E tests, screenshots
5. **`/verify-task`**: Self-check before approval gate
6. **PR review**: Final code review
7. **Commit**: Merge to main

## Steps (Manual for now)

### 1. Define the Feature
Read task N from IMPLEMENTATION_PLAN.md:
- Feature name
- Acceptance criteria
- Dependencies

### 2. Design Phase
- Invoke css-design agent with mockup reference
- Map to tokens, select components

### 3. Architecture Phase
- Invoke vue-specialist agent
- Plan store/composable structure
- Define types and interfaces

### 4. Implementation
- Create type in `src/types/index.ts`
- Create/update store in `src/stores/`
- Create/update composable in `src/composables/`
- Build component(s) in `src/components/`
- Create/update page in `src/pages/`
- Add route in `src/router/index.ts`
- Add i18n keys in `src/i18n/en.ts` AND `src/i18n/fr.ts`

### 5. Testing Phase
- Invoke test-writer agent
- Co-locate unit tests with source
- Create E2E test in `tests/e2e/`
- Add screenshots to `tests/screenshots/`

### 6. Verification
- Run `/verify-task`
- Fix any issues
- Await APPROVE

### 7. Commit
- Run `/status` to confirm
- Type "go" when ready
- PR review executes
- Commit + push + PR

## Acceptance Criteria (all must pass)
- [ ] Feature matches mockup visually
- [ ] All TypeScript types validated
- [ ] Unit test coverage ≥80%
- [ ] E2E test covers happy path + error case
- [ ] i18n keys in both EN and FR
- [ ] ESLint + type-check passing
- [ ] No hardcoded colors/pixels
- [ ] Realtime subscriptions cleaned up
- [ ] `/verify-task` passes
- [ ] PR review APPROVED

## Related Commands
- `/new-page` — Scaffold a page-only
- `/verify-task` — Self-check before approval
- `/test-sprint` — Full E2E gate
