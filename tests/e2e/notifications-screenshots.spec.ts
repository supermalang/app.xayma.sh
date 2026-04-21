import { test } from '@playwright/test'
import path from 'path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'tests/screenshots')
const TEST_CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com'
const TEST_CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'test123456'

async function loginAsCustomer(page: any) {
  await page.goto('http://localhost:5173/auth/login')
  await page.fill('input[type="email"]', TEST_CUSTOMER_EMAIL)
  await page.fill('input[type="password"]', TEST_CUSTOMER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:5173/', { timeout: 60000 })
}

test.describe('Notification Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page)
  })

  test('screenshot: header with notification bell', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/notification-bell-header.png`,
      clip: { x: 0, y: 0, width: 1280, height: 72 },
    })
  })

  test('screenshot: notification feed overlay', async ({ page }) => {
    await page.locator('.pi-bell').click()
    await page.waitForSelector('.p-overlaypanel', { timeout: 3000 })
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/notification-feed.png` })
  })

  test('screenshot: full notifications page', async ({ page }) => {
    await page.goto(`http://localhost:5173/notifications`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/notifications-page.png`,
      fullPage: true,
    })
  })

  test('screenshot: deployment wizard step 1 (service selection)', async ({ page }) => {
    await page.goto(`http://localhost:5173/deployments/new`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/wizard-step-1-services.png`,
      fullPage: true,
    })
  })

  test('screenshot: deployment wizard step 2 (plan selection)', async ({ page }) => {
    await page.goto(`http://localhost:5173/deployments/new`)
    await page.waitForLoadState('networkidle')
    // Click first service to advance to step 2
    const firstService = page.locator('[class*="grid"] div').first()
    if (await firstService.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstService.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/wizard-step-2-plans.png`,
      fullPage: true,
    })
  })
})
