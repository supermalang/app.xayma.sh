import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
}

const TEST_USERS = {
  admin: { email: 'admin@test.example.com', password: 'test123456' },
}

async function loginAs(page: any, role: keyof typeof TEST_USERS) {
  const { email, password } = TEST_USERS[role]
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('Responsive layouts — Login page', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`login page renders at ${name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`${BASE_URL}/auth/login`)

      // Form container must be visible with no horizontal overflow
      const form = page.locator('form')
      await expect(form).toBeVisible()

      // Email and password inputs must be visible
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()

      // Submit button must be visible
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // No horizontal scrollbar — body width equals viewport width
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(size.width + 1)
    })
  }
})

test.describe('Responsive layouts — Unauthenticated redirect', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`/ redirects to login at ${name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`${BASE_URL}/`)
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  }
})

test.describe('Responsive layouts — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`dashboard renders at ${name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`${BASE_URL}/`)

      // Page heading must be visible
      await expect(page.locator('h1')).toBeVisible()

      // Sidebar or nav must be present in the DOM
      const sidebar = page.locator('[class*="sidebar"], nav, aside').first()
      await expect(sidebar).toBeVisible()

      // Main content area must be visible
      const main = page.locator('main, [class*="main-content"], #app > *').first()
      await expect(main).toBeVisible()

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(size.width + 1)
    })
  }
})

test.describe('Responsive layouts — Partners list', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`partners page renders at ${name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`${BASE_URL}/partners`)

      // Page heading must be visible
      await expect(page.locator('h1')).toBeVisible()

      // Table or card list must be visible
      const content = page
        .locator('.p-datatable, [class*="DataTable"], [class*="partner-list"]')
        .first()
      await expect(content).toBeVisible()

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(size.width + 1)
    })
  }
})

test.describe('Responsive layouts — Credits/Buy page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`credits buy page renders at ${name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto(`${BASE_URL}/credits/buy`)

      // Page heading must be visible
      await expect(page.locator('h1')).toBeVisible()

      // Credit bundle cards or purchase form must be present
      const content = page
        .locator('[class*="CreditBundle"], [class*="bundle"], .p-card, form')
        .first()
      await expect(content).toBeVisible()

      // No horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(size.width + 1)
    })
  }
})
