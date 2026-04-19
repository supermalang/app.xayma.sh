/**
 * Deployments Pages — Screenshot Capture (Sprint 3.T6)
 * Captures page structure at desktop (1280px) and mobile (375px) after customer authentication.
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/deployments')

const PAGES = [
  { name: '01-deployments-list', url: '/deployments' },
  { name: '02-deployment-wizard-step1', url: '/deployments/new' },
  { name: '03-deployment-detail', url: '/deployments/1' },
]

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 900 },
  { label: 'mobile', width: 375, height: 812 },
]

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
})

for (const viewport of VIEWPORTS) {
  test.describe(`Deployments — ${viewport.label} (${viewport.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      // Login as customer before each test
      await page.goto('/login')
      await page.fill('input[type="email"]', process.env.E2E_TEST_CUSTOMER_EMAIL || 'customer@test.example.com')
      await page.fill('input[type="password"]', process.env.E2E_TEST_CUSTOMER_PASSWORD || 'customer123456')
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
