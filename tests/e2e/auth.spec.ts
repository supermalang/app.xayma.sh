/**
 * Authentication E2E tests
 * Tests real Supabase integration with test credentials
 */

import { test, expect } from '@playwright/test'

// Load test credentials from environment
// Defaults match MOCK_USERS in src/stores/auth.store.ts
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'test123456',
  },
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/')
  })

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/login')

    // Fill login form
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:5173/')
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('should show error toast on invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/login')

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForSelector('[role="alert"]', { timeout: 5000 })
    const errorMessage = await page.textContent('[role="alert"]')
    expect(errorMessage).toBeTruthy()
  })

  test('should persist session after page refresh', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.customer.email)
    await page.fill('input[type="password"]', TEST_USERS.customer.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Refresh page
    await page.reload()

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('should logout and redirect to login', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Click user menu button (avatar icon)
    await page.click('button.p-button-rounded')

    // Wait for menu to appear and click logout
    await page.waitForSelector('[role="menuitem"]')
    const logoutButton = await page.locator('[role="menuitem"]:has-text("Logout")').first()
    await logoutButton.click()

    // Should be redirected to login
    await page.waitForURL(/\/auth\/login/)
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should redirect authenticated user away from login', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.customer.email)
    await page.fill('input[type="password"]', TEST_USERS.customer.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Try to navigate back to login
    await page.goto('http://localhost:5173/auth/login')

    // Should be redirected to dashboard
    await page.waitForURL('http://localhost:5173/')
    await expect(page).toHaveURL('http://localhost:5173/')
  })

  test('should display sidebar navigation when authenticated', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Check sidebar is visible
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // Check nav items are visible
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Deployments')).toBeVisible()
  })

  test('should display header with user menu when authenticated', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Check header is visible
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Check logo is visible
    await expect(page.locator('text=Xayma.sh')).toBeVisible()

    // Check user menu button exists
    const userMenuButton = page.locator('button.p-button-rounded')
    await expect(userMenuButton).toBeVisible()
  })

  test('should support language toggle between EN and FR', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Find language toggle button (shows current locale)
    const langButton = page.locator('button:has-text("EN")')
    await expect(langButton).toBeVisible()

    // Click to toggle to FR
    await langButton.click()

    // Check that text changes to French
    // The button should now show "FR"
    await expect(page.locator('button:has-text("FR")')).toBeVisible()

    // Check that sidebar nav is translated
    // "Dashboard" in French is "Tableau de bord"
    await expect(page.locator('text=Tableau de bord')).toBeVisible()
  })
})
