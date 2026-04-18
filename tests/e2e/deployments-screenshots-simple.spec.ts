/**
 * Deployment Pages - Simple Screenshot Capture
 * Captures page structure without requiring authentication
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/deployments')

test.describe('Deployment Pages - Structure Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to standard desktop size
    await page.setViewportSize({ width: 1280, height: 1024 })
  })

  test('captures deployment list page structure', async ({ page }) => {
    // Navigate directly to deployments (will show login if not authenticated)
    await page.goto('http://localhost:5173/deployments', { waitUntil: 'networkidle' })

    // Wait a moment for page to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-deployment-list-page.png`,
      fullPage: true,
    })

    console.log('✓ Captured deployment list page')
  })

  test('captures deployment wizard page structure', async ({ page }) => {
    // Navigate to wizard
    await page.goto('http://localhost:5173/deployments/new', { waitUntil: 'networkidle' })

    // Wait a moment for page to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/02-wizard-page.png`,
      fullPage: true,
    })

    console.log('✓ Captured wizard page')
  })

  test('captures deployment detail page structure', async ({ page }) => {
    // Navigate to a deployment detail (will show 404 or login)
    await page.goto('http://localhost:5173/deployments/1', { waitUntil: 'networkidle' })

    // Wait a moment for page to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/03-deployment-detail-page.png`,
      fullPage: true,
    })

    console.log('✓ Captured deployment detail page')
  })

  test('captures login page for context', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' })

    // Wait a moment for page to stabilize
    await page.waitForTimeout(1000)

    // Capture screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/00-login-page.png`,
      fullPage: true,
    })

    console.log('✓ Captured login page')
  })
})
