/**
 * Partner Pages — Screenshot Capture (Sprint 2.T7)
 * Captures page structure for visual regression baseline.
 * Routes redirect to /login when unauthenticated — that state is captured too.
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/partners')

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

test.describe('Partner Pages — Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('partners list page', async ({ page }) => {
    await page.goto('http://localhost:5173/partners', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-partners-list.png'),
      fullPage: true,
    })
  })

  test('partner detail page (TabView)', async ({ page }) => {
    await page.goto('http://localhost:5173/partners/1', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-partner-detail-tabview.png'),
      fullPage: true,
    })
  })

  test('audit log page', async ({ page }) => {
    await page.goto('http://localhost:5173/audit', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-audit-log.png'),
      fullPage: true,
    })
  })

  test('credit purchase options page', async ({ page }) => {
    await page.goto('http://localhost:5173/credits/purchase-options', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-credit-purchase-options.png'),
      fullPage: true,
    })
  })
})
