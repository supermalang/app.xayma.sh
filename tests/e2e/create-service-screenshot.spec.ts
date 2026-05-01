/**
 * Visual-check capture for /services/new (CreateService page).
 * Used by /visual-check to compare against docs/mockups/10-create-service-page.png
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_PATH = path.join(
  __dirname,
  '../screenshots/services/10-create-service-page-desktop.png',
)

test('capture /services/new at desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  await page.fill('input[type="email"]', 'supermalang@outlook.com')
  await page.fill('input[type="password"]', 'P@sser123!')
  await page.click('button:has-text("Login")')
  await page.waitForURL('/')
  await page.goto('/services/new', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
})
