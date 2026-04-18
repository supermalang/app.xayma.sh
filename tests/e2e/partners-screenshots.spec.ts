/**
 * Partner Pages — Screenshot Capture (Sprint 2.T7)
 * Captures page structure at desktop (1280px) and mobile (375px) after admin authentication.
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/partners')

const PAGES = [
  { name: '01-partners-list', url: '/partners' },
  { name: '02-partner-detail-tabview', url: '/partners/1' },
  { name: '03-audit-log', url: '/audit' },
  { name: '04-credit-purchase-options', url: '/credits/purchase-options' },
]

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 900 },
  { label: 'mobile', width: 375, height: 812 },
]

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

for (const viewport of VIEWPORTS) {
  test.describe(`Partner Pages — ${viewport.label} (${viewport.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      // Login as admin before each test
      await page.goto('/login')
      await page.fill('input[type="email"]', 'admin@test.example.com')
      await page.fill('input[type="password"]', 'test123456')
      await page.click('button:has-text("Login")')
      await page.waitForURL('/')
    })

    for (const p of PAGES) {
      test(p.name, async ({ page }) => {
        await page.goto(p.url, { waitUntil: 'networkidle' })
        await page.waitForTimeout(800)
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `${p.name}-${viewport.label}.png`),
          fullPage: true,
        })
      })
    }
  })
}
