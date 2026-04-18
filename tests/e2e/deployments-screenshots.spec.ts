/**
 * Deployment Pages - Screenshot Capture
 * Captures screenshots for: deployment list, wizard (4 steps), and deployment detail
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots/deployments')

// Test credentials
const TEST_CUSTOMER = {
  email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
  password: process.env.TEST_CUSTOMER_PASSWORD || 'customer123456',
}

test.describe('Deployment Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the app root
    await page.goto('http://localhost:5173/')
  })

  test('captures deployment list page', async ({ page }) => {
    // Login as customer
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('http://localhost:5173/')

    // Navigate to deployments
    await page.click('a[href="/deployments"], button:has-text("Deployments")')

    // Wait for page to load
    await expect(page).toHaveURL(/\/deployments/)
    await page.waitForLoadState('networkidle')

    // Capture full page screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-deployment-list.png`,
      fullPage: true,
    })
  })

  test('captures deployment wizard - step 1 (select service)', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')

    // Navigate to wizard
    await page.goto('http://localhost:5173/deployments/new')

    // Wait for wizard to load
    await page.waitForLoadState('networkidle')

    // Capture step 1
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/02-wizard-step1-select-service.png`,
      fullPage: true,
    })
  })

  test('captures deployment wizard - step 2 (choose plan)', async ({ page }) => {
    // Login and navigate to wizard
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')
    await page.goto('http://localhost:5173/deployments/new')

    // Wait for wizard to load
    await page.waitForLoadState('networkidle')

    // Click on a service to move to step 2
    const firstService = await page.locator('[class*="service"]').first()
    if (await firstService.isVisible()) {
      await firstService.click()
      await page.click('button:has-text("Next")')

      // Wait for step 2 to load
      await page.waitForLoadState('networkidle')

      // Capture step 2
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/03-wizard-step2-choose-plan.png`,
        fullPage: true,
      })
    }
  })

  test('captures deployment wizard - step 3 (configure domain)', async ({ page }) => {
    // Login and navigate to wizard
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')
    await page.goto('http://localhost:5173/deployments/new')

    // Wait for wizard to load
    await page.waitForLoadState('networkidle')

    // Progress through steps 1 and 2
    const firstService = await page.locator('[class*="service"]').first()
    if (await firstService.isVisible()) {
      await firstService.click()
      await page.click('button:has-text("Next")')

      const firstPlan = await page.locator('[class*="plan"]').first()
      if (await firstPlan.isVisible()) {
        await firstPlan.click()
        await page.click('button:has-text("Next")')

        // Wait for step 3 to load
        await page.waitForLoadState('networkidle')

        // Capture step 3
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/04-wizard-step3-configure-domain.png`,
          fullPage: true,
        })
      }
    }
  })

  test('captures deployment wizard - step 4 (review & deploy)', async ({ page }) => {
    // Login and navigate to wizard
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')
    await page.goto('http://localhost:5173/deployments/new')

    // Wait for wizard to load
    await page.waitForLoadState('networkidle')

    // Progress through all steps
    const firstService = await page.locator('[class*="service"]').first()
    if (await firstService.isVisible()) {
      await firstService.click()
      await page.click('button:has-text("Next")')

      const firstPlan = await page.locator('[class*="plan"]').first()
      if (await firstPlan.isVisible()) {
        await firstPlan.click()
        await page.click('button:has-text("Next")')

        // Fill in domain if available
        const domainsInput = await page.locator('input[placeholder*="domain"]')
        if (await domainsInput.isVisible()) {
          await domainsInput.fill('test.example.com')
          await domainsInput.press('Enter')
        }

        await page.click('button:has-text("Next")')

        // Wait for step 4 to load
        await page.waitForLoadState('networkidle')

        // Capture step 4
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/05-wizard-step4-review-deploy.png`,
          fullPage: true,
        })
      }
    }
  })

  test('captures deployment detail page', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="password"]', TEST_CUSTOMER.password)
    await page.click('button[type="submit"]')

    // Go to deployments
    await page.goto('http://localhost:5173/deployments')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Click on first deployment if it exists
    const firstDeploymentLink = await page.locator('a[href*="/deployments/"]').first()
    if (await firstDeploymentLink.isVisible()) {
      await firstDeploymentLink.click()

      // Wait for detail page to load
      await page.waitForLoadState('networkidle')

      // Capture deployment detail
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/06-deployment-detail.png`,
        fullPage: true,
      })
    }
  })
})
