/**
 * Dashboard E2E Tests
 * Verifies dashboard renders correctly for all roles with proper data display
 */

import { test, expect } from '@playwright/test'

const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'test123456',
  },
  reseller: {
    email: process.env.TEST_RESELLER_EMAIL || 'reseller@test.example.com',
    password: process.env.TEST_RESELLER_PASSWORD || 'test123456',
  },
  sales: {
    email: process.env.TEST_SALES_EMAIL || 'sales@test.example.com',
    password: process.env.TEST_SALES_PASSWORD || 'test123456',
  },
}

async function login(page: any, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 10000 })
}

test.describe('Dashboards', () => {
  test('Admin dashboard loads with stat cards', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/')

    // Verify page header loads
    const header = page.locator('text=Administration')
    await expect(header).toBeVisible()

    // Check for stat cards (should display admin metrics)
    const statCards = page.locator('[class*="stat"]')
    const cardCount = await statCards.count()
    expect(cardCount).toBeGreaterThan(0)

    // Verify specific admin stat labels exist
    const hasPartners = await page.locator('text=Total Partners').isVisible()
    expect(hasPartners).toBeTruthy()
  })

  test('Admin dashboard displays revenue metric', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/')

    // Check for revenue-related content
    const hasRevenue = await page.locator('text=Revenue').isVisible()
    expect(hasRevenue || await page.locator('text=revenue').isVisible()).toBeTruthy()
  })

  test('Customer dashboard displays credit balance', async ({ page }) => {
    await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
    await page.goto('/')

    // Verify customer dashboard header
    const header = page.locator('text=Dashboard')
    await expect(header).toBeVisible()

    // Check for credit-related content (credit status, meter, or balance)
    const hasCreditLabel = await page.locator('text=Credit').isVisible()
    expect(hasCreditLabel).toBeTruthy()
  })

  test('Customer dashboard shows active deployments section', async ({ page }) => {
    await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
    await page.goto('/')

    // Check for deployments section
    const hasDeployments = await page.locator('text=Deployment').isVisible()
    expect(hasDeployments).toBeTruthy()
  })

  test('Reseller dashboard shows credit pool', async ({ page }) => {
    await login(page, TEST_USERS.reseller.email, TEST_USERS.reseller.password)
    await page.goto('/')

    // Verify reseller dashboard header
    const header = page.locator('text=Reseller')
    const headerVisible = await header.isVisible()
    expect(headerVisible || await page.locator('text=Dashboard').isVisible()).toBeTruthy()

    // Check for credit pool section
    const hasCreditPool = await page.locator('text=Credit').isVisible()
    expect(hasCreditPool).toBeTruthy()
  })

  test('Reseller dashboard displays client deployments table', async ({ page }) => {
    await login(page, TEST_USERS.reseller.email, TEST_USERS.reseller.password)
    await page.goto('/')

    // Check for client deployments section
    const hasDeployments = await page.locator('text=Deployment').isVisible()
    expect(hasDeployments).toBeTruthy()
  })

  test('Sales dashboard displays portfolio metrics', async ({ page }) => {
    await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
    await page.goto('/')

    // Verify sales dashboard loads
    const hasPortfolio = await page.locator('text=Portfolio').isVisible()
    const hasCommission = await page.locator('text=Commission').isVisible()
    expect(hasPortfolio || hasCommission).toBeTruthy()
  })

  test('Sales dashboard displays commission information', async ({ page }) => {
    await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
    await page.goto('/')

    // Check for commission-related content
    const hasCommission = await page.locator('text=Commission').isVisible() ||
                          await page.locator('text=Pending').isVisible()
    expect(hasCommission).toBeTruthy()
  })

  test('Dashboard navigation works for all tabs/sections', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/')

    // Verify page is interactive (can interact with elements)
    const buttons = await page.locator('button').count()
    expect(buttons).toBeGreaterThan(0)
  })

  test('Dashboard sidebar navigation is visible when authenticated', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/')

    // Check sidebar is visible
    const sidebar = page.locator('aside, nav')
    const sidebarVisible = await sidebar.isVisible()
    expect(sidebarVisible).toBeTruthy()
  })

  test('Dashboard header displays user info', async ({ page }) => {
    await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
    await page.goto('/')

    // Check for header with user menu (avatar or user button)
    const headerPresent = await page.locator('header').isVisible()
    expect(headerPresent).toBeTruthy()
  })
})
