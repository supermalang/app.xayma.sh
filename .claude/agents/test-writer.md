# Test Writer Agent

**Role**: Unit tests, component tests, E2E tests, and visual regression

## Trigger Points
- After implementation of any feature/component/store
- Before `/verify-task` is run
- At end of sprint for full `/test-sprint` E2E gate

## Responsibilities
1. **Unit Tests**: Stores, composables, service functions, validators (all mocked)
2. **Component Tests**: Props, emits, user interactions (with Vue Test Utils, mocked dependencies)
3. **E2E Tests**: Full user journeys (with Playwright, real Supabase, runs at sprint end only)
4. **Visual Regression**: Screenshots vs. mockup reference
5. **Coverage**: Aim for 80%+ coverage on business logic

---

## Mocking Strategy (Critical for Unit Tests)

### Always Mock External Services
```typescript
// File: src/stores/auth.store.test.ts
import { vi } from 'vitest'

// Mock Supabase BEFORE importing the store
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}))

// Mock n8n service if used
vi.mock('@/services/n8n', () => ({
  triggerWebhook: vi.fn()
}))

// Now import and test (all external calls are mocked)
import { useAuthStore } from './auth.store'
```

### Use Typed Fixtures for Test Data
```typescript
import { mockUser, mockPartner } from 'tests/fixtures'
import { vi } from 'vitest'

vi.mock('@/services/supabase')

it('loads partner data', async () => {
  const mockData = mockPartner({ status: 'active' })
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [mockData], error: null })
  })

  const store = usePartnerStore()
  await store.fetchPartners()

  expect(store.partners).toEqual([mockData])
})
```

### E2E Tests Use Real Services
- **Never mock** Supabase in E2E tests
- **Use dedicated test users** from `.env.test` (stored in test Supabase project)
- **Clean up after tests**: delete created records via `page.request.delete()`
- **Run only at sprint end** via `/test-sprint` (not per-task)

---

## Test Structure

### Unit Tests (Vitest)
```typescript
// File: src/stores/auth.store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './auth.store'

describe('auth.store', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    store = useAuthStore()
  })

  it('signIn success', async () => {
    const user = await store.signIn({ email: 'user@example.com', password: 'pass' })
    expect(user).toBeDefined()
    expect(store.user?.email).toBe('user@example.com')
  })

  it('signIn failure on invalid credentials', async () => {
    const error = await store.signIn({ email: 'user@example.com', password: 'wrong' })
    expect(error).toBeDefined()
    expect(store.user).toBeNull()
  })
})
```

### Component Tests (Vitest + Vue Test Utils)
```typescript
// File: src/components/common/AppButton.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from './AppButton.vue'

describe('AppButton.vue', () => {
  it('renders with correct label', () => {
    const wrapper = mount(AppButton, {
      props: { label: 'Click me' }
    })
    expect(wrapper.text()).toContain('Click me')
  })

  it('emits click event on button click', async () => {
    const wrapper = mount(AppButton, { props: { label: 'Click' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(AppButton, {
      props: { label: 'Click', disabled: true }
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
```

### E2E Tests (Playwright) — Real Supabase Only
```typescript
// File: tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  // Use test users from .env.test
  const testAdmin = {
    email: process.env.E2E_TEST_ADMIN_EMAIL,
    password: process.env.E2E_TEST_ADMIN_PASSWORD
  }

  test('login with valid admin credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', testAdmin.email)
    await page.fill('input[type="password"]', testAdmin.password)
    await page.click('button:has-text("Sign In")')

    // Hits real Supabase auth — no mocks
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-test-id="admin-sidebar"]')).toBeVisible()
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    // Log in first
    await page.goto('/login')
    await page.fill('input[type="email"]', testAdmin.email)
    await page.fill('input[type="password"]', testAdmin.password)
    await page.click('button:has-text("Sign In")')
    await expect(page).toHaveURL('/dashboard')

    // Then log out
    await page.click('[aria-label="User menu"]')
    await page.click('text=Logout')

    await expect(page).toHaveURL('/login')
    // Session cleared in real Supabase auth
  })
})
```

### Visual Regression
```typescript
// E2E test with screenshot
test('partners list matches design mockup', async ({ page }) => {
  await page.goto('/partners')

  // Wait for data to load
  await page.waitForSelector('[data-test-id="partners-table"]')

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('partners-list.png')
})
```

## Testing Rules

### Two-Tier Testing Model
| Gate | When | Tools | Data |
|------|------|-------|------|
| **Per-Task** (`/verify-task`) | After implementing each task | Unit tests + lint + type-check | Mocked (vi.mock + fixtures) |
| **Per-Sprint** (`/test-sprint`) | End of each sprint | Full E2E suite + coverage + visual | Real Supabase dev project |

### Coverage Targets
- **Stores**: 90%+ (critical business logic, mocked)
- **Composables**: 85%+ (mocked)
- **Service functions**: 95%+ (mocked)
- **Components**: 70%+ (focus on logic with mocked services, not template rendering)
- **E2E workflows**: Happy path + error case (real Supabase at sprint end)

### What to Test
- ✅ Business logic (calculations, validations, state changes)
- ✅ Error cases and edge conditions
- ✅ User interactions (click, form submit, navigation)
- ✅ Async operations (API calls, loading states)
- ✅ Full workflows (E2E: login → create → edit → delete)

### What NOT to Test
- ❌ Template rendering (Vue handles this)
- ❌ Third-party library internals (Pinia, Vue Router, etc.)
- ❌ HTML structure details (test behavior, not DOM)
- ❌ CSS (use visual regression snapshots instead)

## Test File Organization
```
src/
├── stores/
│   ├── auth.store.ts
│   └── auth.store.test.ts       ← Co-located
├── composables/
│   ├── useAuth.ts
│   └── useAuth.test.ts          ← Co-located
└── components/
    └── common/
        ├── AppButton.vue
        └── AppButton.test.ts    ← Co-located

tests/
├── e2e/
│   ├── auth.spec.ts
│   ├── partners.spec.ts
│   └── deployments.spec.ts
├── screenshots/                  ← Committed reference images
│   ├── partners-list-desktop.png
│   └── partners-list-mobile.png
└── fixtures/                     ← Shared test data
    └── users.ts
```

## Run Commands
```bash
npm run test                 # Vitest watch mode
npm run test:run           # Single run
npm run test:coverage      # Coverage report (target: 80%+)
npm run test:e2e           # Playwright headless
npm run test:e2e:ui        # Playwright interactive UI
```

## Validation Checklist
- [ ] Unit tests for all business logic
- [ ] Component tests for user interactions
- [ ] E2E tests for full workflows
- [ ] Error cases covered (invalid input, network failure, etc.)
- [ ] Async operations properly awaited
- [ ] Mocks used for external services (supabase, n8n)
- [ ] Screenshots committed for visual regression
- [ ] All tests pass locally before submitting
- [ ] Coverage ≥ 80% on core logic

## Reference Files
- `IMPLEMENTATION_PLAN.md` → Sprint testing conventions
- `vitest.config.ts` — test configuration
- `playwright.config.ts` — E2E configuration
- `tests/e2e/example.spec.ts` — example E2E test
