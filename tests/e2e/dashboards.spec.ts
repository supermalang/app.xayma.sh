import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

const TEST_USERS = {
  admin: { email: 'admin@test.example.com', password: 'test123456' },
  customer: { email: 'customer@test.example.com', password: 'test123456' },
  reseller: { email: 'reseller@test.example.com', password: 'test123456' },
  sales: { email: 'sales@test.example.com', password: 'test123456' },
}

async function loginAs(page: any, role: keyof typeof TEST_USERS) {
  const { email, password } = TEST_USERS[role]
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('Dashboard route guard', () => {
  test('unauthenticated access to / redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('renders at /', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`)
  })

  test('shows Admin Dashboard title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard')
  })
})

test.describe('Customer dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer')
  })

  test('renders at /', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`)
  })

  test('shows Dashboard title', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Reseller dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'reseller')
  })

  test('renders at /', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`)
  })

  test('shows Reseller Dashboard title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Reseller Dashboard')
  })
})

test.describe('Sales dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'sales')
  })

  test('renders at /', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`)
  })

  test('shows Sales Dashboard title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Sales Dashboard')
  })
})
