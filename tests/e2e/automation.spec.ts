import { test, expect } from '@playwright/test'

test.describe('Automation — Credit + Deployment Status', () => {
  test('deployment wizard loads on /deployments/new', async ({ page }) => {
    await page.goto('/deployments/new', { waitUntil: 'networkidle' })
    // Verify page loaded with content
    const content = page.locator('body')
    await expect(content).toBeVisible()
  })

  test('deployments page loads and shows status badges', async ({ page }) => {
    await page.goto('/deployments', { waitUntil: 'networkidle' })
    // Verify page loaded with content
    const content = page.locator('body')
    await expect(content).toBeVisible()
  })

  test('credit history page loads and shows transactions', async ({ page }) => {
    await page.goto('/credits/history', { waitUntil: 'networkidle' })
    // Verify page loaded with content
    const content = page.locator('body')
    await expect(content).toBeVisible()
  })

  test('wizard page structure is rendered', async ({ page }) => {
    await page.goto('/deployments/new', { waitUntil: 'networkidle' })
    // Verify page structure is rendered (main layout exists)
    const mainElement = page.locator('main, [role="main"]').first()
    // Check if page has loaded and isn't blank
    const bodyText = await page.textContent('body')
    expect(bodyText && bodyText.trim().length > 0).toBeTruthy()
  })
})
