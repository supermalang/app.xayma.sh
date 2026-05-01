/**
 * Visual-check capture for /services (Services index page).
 * Used by /visual-check to compare against docs/mockups/12-service-index-page.png
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { loginAsAdmin } from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_PATH = path.join(
  __dirname,
  '../screenshots/services/12-service-index-page-desktop.png',
)

test('capture /services at desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAsAdmin(page)
  await page.goto('/services', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
})
