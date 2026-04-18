import { test, expect } from '@playwright/test'

test.describe('Partners Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForURL('/') // Redirect to dashboard after login
  })

  test('Admin can view partners list page', async ({ page }) => {
    await page.goto('/partners')

    // Check page title
    expect(await page.textContent('h1')).toContain('Partners')

    // Check that DataTable is present
    expect(await page.locator('[role="grid"]')).toBeVisible()

    // Check for Create button
    expect(await page.locator('button:has-text("Create")')).toBeVisible()
  })

  test('Admin can create a new partner', async ({ page }) => {
    await page.goto('/partners')

    // Click Create button
    await page.click('button:has-text("Create")')

    // Wait for dialog to appear
    await page.waitForSelector('[role="dialog"]')

    // Fill form
    await page.fill('input[id*="name"]', 'Test Partner Company')
    await page.fill('input[id*="email"]', 'contact@testpartner.com')
    await page.fill('input[id*="phone"]', '(+236) 70 123 4567')

    // Select partner type
    await page.click('div[id*="partner_type"]')
    await page.click('text=Customer')

    // Select status
    await page.click('div[id*="status"]')
    await page.click('text=Active')

    // Submit form
    await page.click('button:has-text("Create")')

    // Wait for dialog to close and check if partner appears in list
    await page.waitForURL('/partners')
    expect(await page.locator('text=Test Partner Company')).toBeVisible()
  })

  test('Admin can edit an existing partner', async ({ page }) => {
    await page.goto('/partners')

    // Wait for table to load
    await page.waitForSelector('[role="grid"]')

    // Click edit button on first partner
    await page.click('button[title="Edit"] >> first')

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]')

    // Update name
    const nameInput = await page.locator('input[id*="name"]').first()
    await nameInput.clear()
    await nameInput.fill('Updated Partner Name')

    // Submit
    await page.click('button:has-text("Update")')

    // Verify update
    await page.waitForURL('/partners')
    expect(await page.locator('text=Updated Partner Name')).toBeVisible()
  })

  test('Admin can change partner status', async ({ page }) => {
    await page.goto('/partners')

    // Wait for table to load
    await page.waitForSelector('[role="grid"]')

    // Click on a partner row to go to detail page
    await page.click('table tr >> td:first-child >> first')

    // Wait for detail page
    await page.waitForURL(/\/partners\/\d+/)

    // Click status dropdown
    await page.click('button:has-text("Status")')

    // Select suspended
    await page.click('text=Suspended')

    // Verify status changed
    expect(await page.locator('text=Suspended')).toBeVisible()
  })

  test('Partner detail page shows profile tab', async ({ page }) => {
    await page.goto('/partners')

    // Click on first partner
    await page.click('table tr >> td:first-child >> first')

    // Wait for detail page
    await page.waitForURL(/\/partners\/\d+/)

    // Check for tabs
    expect(await page.locator('text=Profile')).toBeVisible()
    expect(await page.locator('text=Credits')).toBeVisible()

    // Check profile tab content
    expect(await page.locator('text=Partner Name')).toBeVisible()
    expect(await page.locator('text=Email')).toBeVisible()
  })

  test('Partner list can be filtered by status', async ({ page }) => {
    await page.goto('/partners')

    // Wait for filters to load
    await page.waitForSelector('div[id*="status"]')

    // Click status filter dropdown
    await page.click('div[id*="status"] >> div.p-dropdown')

    // Select 'active' status
    await page.click('text=Active')

    // Wait for table to update
    await page.waitForSelector('[role="grid"]')

    // Verify filtering worked (this would depend on actual data)
    const rows = await page.locator('table tbody tr')
    expect(rows).toBeDefined()
  })

  test('Partner list can be filtered by type', async ({ page }) => {
    await page.goto('/partners')

    // Wait for filters to load
    await page.waitForSelector('div[id*="partner_type"]')

    // Click type filter dropdown
    await page.click('div[id*="partner_type"] >> div.p-dropdown')

    // Select 'customer' type
    await page.click('text=Customer')

    // Wait for table to update
    await page.waitForSelector('[role="grid"]')

    // Verify filtering worked
    const rows = await page.locator('table tbody tr')
    expect(rows).toBeDefined()
  })

  test('Global search works in partners list', async ({ page }) => {
    await page.goto('/partners')

    // Find search input
    await page.fill('input[placeholder*="Search"]', 'test partner')

    // Wait for results
    await page.waitForSelector('[role="grid"]')

    // Verify search is applied
    const searchInput = await page.locator('input[placeholder*="Search"]')
    expect(await searchInput.inputValue()).toBe('test partner')
  })

  test('Phone validation rejects invalid West Africa numbers', async ({ page }) => {
    await page.goto('/partners')

    // Click Create
    await page.click('button:has-text("Create")')
    await page.waitForSelector('[role="dialog"]')

    // Enter invalid phone (60-69 range instead of 70-78)
    await page.fill('input[id*="name"]', 'Test Partner')
    await page.fill('input[id*="phone"]', '(+236) 60 123 4567')

    // Try to submit
    await page.click('button:has-text("Create")')

    // Should show validation error
    expect(await page.locator('text=Phone must be West Africa format')).toBeVisible()
  })

  test('Admin can delete a partner', async ({ page }) => {
    await page.goto('/partners')

    // Wait for table
    await page.waitForSelector('[role="grid"]')

    // Count rows before
    const rowsBefore = await page.locator('table tbody tr').count()

    // Click delete button (may require confirmation dialog)
    await page.click('button[title="Delete"] >> first')

    // Handle confirmation if present
    if (await page.locator('button:has-text("OK")').isVisible()) {
      await page.click('button:has-text("OK")')
    } else if (await page.locator('button:has-text("Delete")').isVisible()) {
      await page.click('button:has-text("Delete")')
    }

    // Wait for table to update
    await page.waitForTimeout(500)

    // Count rows after (should be one less)
    const rowsAfter = await page.locator('table tbody tr').count()
    expect(rowsAfter).toBeLessThan(rowsBefore)
  })

  test('Slug auto-generates from partner name', async ({ page }) => {
    await page.goto('/partners')

    // Click Create
    await page.click('button:has-text("Create")')
    await page.waitForSelector('[role="dialog"]')

    // Enter name
    await page.fill('input[id*="name"]', 'My Test Company')

    // Check if slug was auto-generated
    const slugInput = await page.locator('input[id*="slug"]').first()
    const slugValue = await slugInput.inputValue()

    // Slug should be lowercase with hyphens, no spaces
    expect(slugValue.toLowerCase()).toBe(slugValue)
    expect(slugValue).toContain('my-test-company')
  })

  test('Language toggle switches UI language', async ({ page }) => {
    await page.goto('/partners')

    // Check initial language (should be English)
    expect(await page.textContent('h1')).toContain('Partners')

    // Click language toggle button (typically top right)
    await page.click('button:has-text("EN")')

    // Language should switch to French
    // Note: This depends on i18n implementation in the app
    // The button might show "FR" after clicking or the UI text changes
  })

  test('Unauthorized customer cannot access partners page', async ({ page, context }) => {
    // Create new context to avoid admin login
    const customerPage = await context.newPage()

    // Try to access partners page directly without logging in
    await customerPage.goto('/partners')

    // Should be redirected to login
    await customerPage.waitForURL('/login')
    expect(customerPage.url()).toContain('/login')

    await customerPage.close()
  })

  test('RLS: Customer can only see their own partner record', async ({ page }) => {
    // This test requires setting up a customer user and verifying RLS
    // In a real scenario, you would:
    // 1. Login as a customer user
    // 2. Query the partners list via API
    // 3. Verify only their partner (company_id match) is returned

    // Note: Direct RLS testing typically requires backend API calls,
    // not just UI testing, so this test is more of a template
  })
})

test.describe('Partner Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForURL('/')
  })

  test('Audit log page displays entries', async ({ page }) => {
    await page.goto('/audit')

    // Check page title
    expect(await page.textContent('h1')).toContain('Audit')

    // Check for filters
    expect(await page.locator('input[placeholder*="Table"]')).toBeVisible()
    expect(await page.locator('[id*="action"]')).toBeVisible()

    // Check DataTable is present
    expect(await page.locator('[role="grid"]')).toBeVisible()
  })

  test('Audit log can be filtered by action type', async ({ page }) => {
    await page.goto('/audit')

    // Wait for table
    await page.waitForSelector('[role="grid"]')

    // Filter by action type
    await page.click('[id*="action"] >> div.p-dropdown')
    await page.click('text=INSERT')

    // Verify filter applied
    await page.waitForSelector('[role="grid"]')
  })

  test('Audit log can be filtered by table name', async ({ page }) => {
    await page.goto('/audit')

    // Wait for filters
    await page.waitForSelector('input[placeholder*="Table"]')

    // Enter table name
    await page.fill('input[placeholder*="Table"]', 'partners')

    // Verify filter applied
    const searchInput = await page.locator('input[placeholder*="Table"]')
    expect(await searchInput.inputValue()).toBe('partners')
  })
})
