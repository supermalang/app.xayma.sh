/**
 * Visual-check capture for /credits/history (Credits & Billing page).
 * Used by /visual-check to compare against docs/mockups/14-credits-index.png
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_PATH = path.join(
  __dirname,
  '../screenshots/credits/14-credits-index-desktop.png',
)

const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com'
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'test123456'

test('capture /credits/history at desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/login')
  await page.fill('input[type="email"]', CUSTOMER_EMAIL)
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD)
  await page.click('button:has-text("Login")')
  await page.waitForURL('/')

  await page.goto('/credits/history', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
})
