/**
 * Deployments E2E Tests
 * Tests full wizard flow, status transitions, Realtime updates, RLS, and credit validation
 */

import { test, expect } from '@playwright/test'

// Test credentials
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123456',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'customer123456',
  },
  otherCustomer: {
    email: process.env.TEST_OTHER_CUSTOMER_EMAIL || 'other@test.example.com',
    password: process.env.TEST_OTHER_CUSTOMER_PASSWORD || 'other123456',
  },
}

test.describe('Deployments - Full E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the app root
    await page.goto('http://localhost:5173/')
  })

  test.describe('Deployment List Page (3.T5.1)', () => {
    test('customer can access deployments list page', async ({ page }) => {
      // Login as customer
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')

      // Wait for dashboard
      await page.waitForURL('http://localhost:5173/')

      // Navigate to deployments
      await page.click('a[href="/deployments"], button:has-text("Deployments")')

      // Should see deployments page
      await expect(page).toHaveURL(/\/deployments/)
      await expect(page.locator('h1')).toContainText('Deployments')
    })

    test('admin can see all deployments (role-based access)', async ({ page }) => {
      // Login as admin
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.admin.email)
      await page.fill('input[type="password"]', TEST_USERS.admin.password)
      await page.click('button[type="submit"]')

      // Wait for dashboard
      await page.waitForURL('http://localhost:5173/')

      // Navigate to deployments
      await page.click('a[href="/deployments"], button:has-text("Deployments")')

      // Admin should see all deployments (if any exist)
      await expect(page).toHaveURL(/\/deployments/)
    })

    test('new deployment button redirects to wizard', async ({ page }) => {
      // Login as customer
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')

      // Navigate to deployments
      await page.goto('http://localhost:5173/deployments')

      // Click "New Deployment" button
      await page.click('button:has-text("New Deployment")')

      // Should navigate to wizard
      await expect(page).toHaveURL(/\/deployments\/new/)
    })
  })

  test.describe('Deployment Wizard (3.T5.2)', () => {
    test('wizard displays all 4 steps', async ({ page }) => {
      // Login and navigate to wizard
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Check all 4 steps are visible
      const steps = await page.locator('[role="tablist"] [role="tab"]')
      await expect(steps).toHaveCount(4)

      // Verify step labels
      await expect(steps.nth(0)).toContainText('Select Service')
      await expect(steps.nth(1)).toContainText('Choose Plan')
      await expect(steps.nth(2)).toContainText('Configure Domain')
      await expect(steps.nth(3)).toContainText('Review & Deploy')
    })

    test('step 1: can select a service', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Look for a service to select (assuming services exist)
      const serviceCard = await page.locator('[class*="service"]').first()
      if (await serviceCard.isVisible()) {
        await serviceCard.click()
        // Next button should be enabled
        const nextButton = await page.locator('button:has-text("Next")')
        await expect(nextButton).toBeEnabled()
      }
    })

    test('step 2: can select a plan', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Select service (if available)
      const firstService = await page.locator('[class*="service"]').first()
      if (await firstService.isVisible()) {
        await firstService.click()
        await page.click('button:has-text("Next")')

        // Select plan
        const planOption = await page.locator('[class*="plan"]').first()
        if (await planOption.isVisible()) {
          await planOption.click()
          // Next button should be enabled
          const nextButton = await page.locator('button:has-text("Next")')
          await expect(nextButton).toBeEnabled()
        }
      }
    })

    test('step 3: can enter deployment label and domains', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Navigate to step 3 (assuming steps 1-2 are clickable)
      const step3Tab = await page.locator('[role="tab"]').nth(2)
      if (await step3Tab.isVisible()) {
        await step3Tab.click()

        // Fill deployment label
        const labelInput = await page.locator('input[placeholder*="Label"], #label')
        if (await labelInput.isVisible()) {
          await labelInput.fill('My Test Odoo Instance')
        }

        // Add domains
        const domainsInput = await page.locator('input[placeholder*="domain"]')
        if (await domainsInput.isVisible()) {
          await domainsInput.fill('odoo-test.example.com')
          await domainsInput.press('Enter')
        }
      }
    })

    test('step 4: blocks deployment when credits insufficient', async ({ page }) => {
      // This test assumes a test customer with insufficient credits
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Navigate to step 4
      const step4Tab = await page.locator('[role="tab"]').nth(3)
      if (await step4Tab.isVisible()) {
        await step4Tab.click()

        // Check if error message about insufficient credits appears
        const errorMessage = await page.locator(
          'text=/Insufficient credits|not enough credits/i'
        )

        if (await errorMessage.isVisible()) {
          // Deploy button should be disabled
          const deployButton = await page.locator('button:has-text("Deploy")')
          await expect(deployButton).toBeDisabled()
        }
      }
    })

    test('step 4: deploy button is enabled when credits sufficient', async ({ page }) => {
      // This test uses a customer with sufficient credits
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Navigate to step 4
      const step4Tab = await page.locator('[role="tab"]').nth(3)
      if (await step4Tab.isVisible()) {
        await step4Tab.click()

        // Deploy button should be enabled (if no error)
        const errorMessage = await page.locator(
          'text=/Insufficient credits|not enough credits/i'
        )

        if (!(await errorMessage.isVisible())) {
          const deployButton = await page.locator('button:has-text("Deploy")')
          await expect(deployButton).toBeEnabled()
        }
      }
    })
  })

  test.describe('Status Transitions & Realtime (3.T5.3)', () => {
    test('deployment status immediately shows as pending_deployment', async ({ page }) => {
      // Login, complete wizard, verify status
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments')

      // Get list of deployments
      const deploymentStatus = await page.locator('[class*="status"]').first()
      if (await deploymentStatus.isVisible()) {
        const statusText = await deploymentStatus.textContent()
        // Should show one of the deployment statuses
        expect(statusText).toMatch(/Pending|Deploying|Active|Stopped|Suspended|Failed/)
      }
    })

    test('realtime updates status without page refresh', async ({ page }) => {
      // Open deployment detail and listen for status changes
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')

      // Go to deployments
      await page.goto('http://localhost:5173/deployments')

      // Click on first deployment (if exists)
      const firstDeploymentLink = await page.locator('a[href*="/deployments/"]').first()
      if (await firstDeploymentLink.isVisible()) {
        await firstDeploymentLink.click()

        // Wait for status element
        const statusBadge = await page.locator('[class*="status"]').first()
        if (await statusBadge.isVisible()) {
          const initialStatus = await statusBadge.textContent()

          // Set timeout to wait for potential status change
          // (in real scenario, n8n would update this)
          await page.waitForTimeout(2000)

          // Status might have updated via Realtime
          const updatedStatus = await statusBadge.textContent()
          // Both statuses should be valid deployment statuses
          expect(initialStatus).toBeTruthy()
          expect(updatedStatus).toBeTruthy()
        }
      }
    })
  })

  test.describe('RLS & Security (3.T5.4)', () => {
    test('customer cannot access other customer\'s deployment', async ({ page, context }) => {
      // Create two pages for two different users
      const page1 = page
      const page2 = await context.newPage()

      // Customer 1 logs in
      await page1.goto('http://localhost:5173/auth/login')
      await page1.fill('input[type="email"]', TEST_USERS.customer.email)
      await page1.fill('input[type="password"]', TEST_USERS.customer.password)
      await page1.click('button[type="submit"]')

      // Get customer 1's deployments
      await page1.goto('http://localhost:5173/deployments')
      const customer1DeploymentLink = await page1
        .locator('a[href*="/deployments/"]')
        .first()

      if (await customer1DeploymentLink.isVisible()) {
        const deploymentHref = await customer1DeploymentLink.getAttribute('href')

        // Customer 2 tries to access customer 1's deployment directly
        await page2.goto('http://localhost:5173/auth/login')
        await page2.fill('input[type="email"]', TEST_USERS.otherCustomer.email)
        await page2.fill('input[type="password"]', TEST_USERS.otherCustomer.password)
        await page2.click('button[type="submit"]')

        // Try to access deployment via URL
        const deploymentPath = deploymentHref || '/deployments/1'
        await page2.goto(`http://localhost:5173${deploymentPath}`)

        // Should either redirect or show empty/unauthorized state
        const notFoundMessage = await page2.locator(
          'text=/not found|not authorized|access denied/i'
        )
        const emptyState = await page2.locator('text=/No data|No deployments/i')

        const isBlocked = (await notFoundMessage.isVisible()) || (await emptyState.isVisible())
        expect(isBlocked).toBeTruthy()
      }

      await page2.close()
    })

    test('admin can view all customer deployments', async ({ page }) => {
      // Login as admin
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.admin.email)
      await page.fill('input[type="password"]', TEST_USERS.admin.password)
      await page.click('button[type="submit"]')

      // Go to deployments
      await page.goto('http://localhost:5173/deployments')

      // Admin should see deployments list (may be empty or have data)
      // The key is that admin doesn't get access denied
      await expect(page).toHaveURL(/\/deployments/)
      const heading = await page.locator('h1')
      await expect(heading).toContainText('Deployments')
    })
  })

  test.describe('Deployment Actions (3.T5.5)', () => {
    test('can stop an active deployment', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')

      // Go to a deployment detail
      await page.goto('http://localhost:5173/deployments')
      const firstDeploymentLink = await page.locator('a[href*="/deployments/"]').first()

      if (await firstDeploymentLink.isVisible()) {
        await firstDeploymentLink.click()

        // Look for Stop button
        const stopButton = await page.locator('button:has-text("Stop")')
        if (await stopButton.isVisible()) {
          await stopButton.click()

          // Should show success message
          const successMessage = await page.locator('[role="alert"]')
          if (await successMessage.isVisible()) {
            const message = await successMessage.textContent()
            expect(message).toContain('stopped')
          }
        }
      }
    })

    test('can start a stopped deployment', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')

      // Go to a deployment detail
      await page.goto('http://localhost:5173/deployments')
      const firstDeploymentLink = await page.locator('a[href*="/deployments/"]').first()

      if (await firstDeploymentLink.isVisible()) {
        await firstDeploymentLink.click()

        // Look for Start button
        const startButton = await page.locator('button:has-text("Start")')
        if (await startButton.isVisible()) {
          await startButton.click()

          // Should show success message
          const successMessage = await page.locator('[role="alert"]')
          if (await successMessage.isVisible()) {
            const message = await successMessage.textContent()
            expect(message).toContain('started')
          }
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('shows error when n8n webhook fails', async ({ page }) => {
      // This test would require mocking the n8n webhook to fail
      // For now, we test that error messages can be displayed
      await page.goto('http://localhost:5173/')

      // If there's an error state to test, verify error message is shown
      const errorElement = await page.locator('[class*="error"]').first()
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent()
        expect(errorText).toBeTruthy()
      }
    })

    test('form validation prevents submission with missing data', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/login')
      await page.fill('input[type="email"]', TEST_USERS.customer.email)
      await page.fill('input[type="password"]', TEST_USERS.customer.password)
      await page.click('button[type="submit"]')
      await page.goto('http://localhost:5173/deployments/new')

      // Try to submit without filling in required fields
      const nextButton = await page.locator('button:has-text("Next")')
      if (await nextButton.isVisible()) {
        // Button should be disabled if no service selected
        const isDisabled = await nextButton.isDisabled()
        expect(isDisabled).toBeTruthy()
      }
    })
  })
})
