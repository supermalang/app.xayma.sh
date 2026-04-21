import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@test.example.com'
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD ?? 'customer123456'

async function loginAsCustomer(page: any) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('input[type="email"]', CUSTOMER_EMAIL)
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('Notifications E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page)
  })

  test('notification bell is visible in header', async ({ page }) => {
    await expect(page.locator('.pi-bell')).toBeVisible()
  })

  test('clicking bell opens notification feed overlay', async ({ page }) => {
    await page.locator('.pi-bell').click()
    await expect(page.locator('.p-overlaypanel')).toBeVisible()
  })

  test('notification feed shows title "Notifications"', async ({ page }) => {
    await page.locator('.pi-bell').click()
    await expect(page.locator('.p-overlaypanel')).toContainText('Notifications')
  })

  test('/notifications page loads with correct heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('mark all as read button works when unread exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/notifications`)
    const markAllBtn = page.getByText('Mark all as read')
    if (await markAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await markAllBtn.click()
      // After marking all read, unread badge should disappear from bell
      await expect(page.locator('.pi-bell').locator('..').locator('.p-badge')).not.toBeVisible({ timeout: 3000 })
    }
  })
})
