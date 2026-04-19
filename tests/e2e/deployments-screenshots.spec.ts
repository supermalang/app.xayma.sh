/**
 * Deployments Pages — Screenshot Capture (Sprint 3.T6)
 * Captures page structure at desktop (1280px) and mobile (375px).
 * Uses viewport-loop pattern matching canonical partners-screenshots.spec.ts.
 */

import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/deployments')

const PAGES = [
  { name: '01-deployments-list', url: 'http://localhost:5173/deployments' },
  { name: '02-deployment-wizard-step1', url: 'http://localhost:5173/deployments/new' },
  { name: '03-deployment-detail', url: 'http://localhost:5173/deployments/1' },
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
    })

    for (const p of PAGES) {
      test(`${p.name} — ${viewport.label}`, async ({ page }) => {
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
