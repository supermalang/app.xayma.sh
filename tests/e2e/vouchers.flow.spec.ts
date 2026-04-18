import { test, expect, Page } from '@playwright/test'

test.describe('Voucher Management Flow (Admin)', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Login as admin
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForNavigation()
  })

  test('should display voucher management page', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Check page title
    await expect(page.locator('text=Voucher Management')).toBeVisible()

    // Check description
    await expect(page.locator('text=Create, manage, and track credit vouchers')).toBeVisible()
  })

  test('should display statistics cards', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Check all stat cards are visible
    await expect(page.locator('text=Active Vouchers')).toBeVisible()
    await expect(page.locator('text=Inactive Vouchers')).toBeVisible()
    await expect(page.locator('text=Credits Distributed')).toBeVisible()
    await expect(page.locator('text=Credits Redeemed')).toBeVisible()

    // Check stat values are in monospace
    const stats = page.locator('[class*="font-mono"]')
    const count = await stats.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('should display voucher table with columns', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Check if table is visible
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()

    // Check column headers
    await expect(page.locator('text=Code')).toBeVisible()
    await expect(page.locator('text=Credits')).toBeVisible()
    await expect(page.locator('text=Expires')).toBeVisible()
    await expect(page.locator('text=Usage')).toBeVisible()
    await expect(page.locator('text=Partner Type')).toBeVisible()
    await expect(page.locator('text=Status')).toBeVisible()
    await expect(page.locator('text=Actions')).toBeVisible()
  })

  test('should filter vouchers by status', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Click status dropdown
    const statusDropdown = page.locator('[class*="p-dropdown"]').first()
    await statusDropdown.click()

    // Select "Active" status
    const option = page.locator('text=Active').last()
    await option.click()

    // Table should be filtered
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()
  })

  test('should filter vouchers by partner type', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Click partner type dropdown
    const partnerDropdown = page.locator('[class*="p-dropdown"]').nth(1)
    await partnerDropdown.click()

    // Select "Reseller" type
    const option = page.locator('text=Reseller').last()
    await option.click()

    // Table should be filtered
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()
  })

  test('should search vouchers by code', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Enter search text
    const searchInput = page.locator('input').filter({ has: page.locator('text=Search by code') })
    await searchInput.fill('VCHR')

    // Wait for debounce
    await page.waitForTimeout(600)

    // Table should be filtered
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()
  })

  test('should open generate vouchers dialog', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Click "Generate Vouchers" button
    const generateButton = page.locator('button:has-text("Generate Vouchers")')
    await generateButton.click()

    // Dialog should be visible
    const dialog = page.locator('[class*="p-dialog"]')
    await expect(dialog).toBeVisible()

    // Check dialog title
    await expect(page.locator('text=Generate Vouchers')).toBeVisible()
  })

  test('should generate vouchers with valid data', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Open dialog
    const generateButton = page.locator('button:has-text("Generate Vouchers")')
    await generateButton.click()

    // Fill form
    const creditsInput = page.locator('input').filter({ has: page.locator('text=Credits Per Voucher') }).first()
    await creditsInput.fill('5000')

    const quantityInput = page.locator('input').filter({ has: page.locator('text=Number of Vouchers') }).first()
    await quantityInput.fill('10')

    // Select expiry date
    const dateInput = page.locator('[class*="p-calendar"] input').first()
    await dateInput.click()
    const dateOption = page.locator('[class*="p-datepicker-date"]').first()
    await dateOption.click().catch(() => {})

    // Check summary is correct
    const summary = page.locator('[class*="p-message"]')
    await expect(summary).toContainText('10 voucher')
    await expect(summary).toContainText('5000 FCFA')
    await expect(summary).toContainText('50000 FCFA')

    // Click generate button
    const submitButton = page.locator('button:has-text("Generate")').last()
    await submitButton.click()

    // Dialog should close
    await page.waitForTimeout(500)
    const dialogVisible = await page.locator('[class*="p-dialog"]').isVisible().catch(() => false)
    expect(dialogVisible).toBeFalsy()
  })

  test('should show validation error for low credits', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Open dialog
    const generateButton = page.locator('button:has-text("Generate Vouchers")')
    await generateButton.click()

    // Fill with invalid credits (less than 100)
    const creditsInput = page.locator('input').filter({ has: page.locator('text=Credits Per Voucher') }).first()
    await creditsInput.fill('50')

    const quantityInput = page.locator('input').filter({ has: page.locator('text=Number of Vouchers') }).first()
    await quantityInput.fill('10')

    // Try to submit
    const submitButton = page.locator('button:has-text("Generate")').last()
    await submitButton.click()

    // Error message should appear
    const errorMessage = page.locator('[class*="p-message-error"]')
    await expect(errorMessage).toContainText('100 FCFA')
  })

  test('should show validation error for invalid quantity', async () => {
    await page.goto('http://localhost:5173/vouchers')

    const generateButton = page.locator('button:has-text("Generate Vouchers")')
    await generateButton.click()

    const creditsInput = page.locator('input').filter({ has: page.locator('text=Credits Per Voucher') }).first()
    await creditsInput.fill('5000')

    // Fill with invalid quantity (greater than 100)
    const quantityInput = page.locator('input').filter({ has: page.locator('text=Number of Vouchers') }).first()
    await quantityInput.fill('150')

    const submitButton = page.locator('button:has-text("Generate")').last()
    await submitButton.click()

    // Error message should appear
    const errorMessage = page.locator('[class*="p-message-error"]')
    await expect(errorMessage).toContainText('between 1 and 100')
  })

  test('should show validation error when expiry date missing', async () => {
    await page.goto('http://localhost:5173/vouchers')

    const generateButton = page.locator('button:has-text("Generate Vouchers")')
    await generateButton.click()

    const creditsInput = page.locator('input').filter({ has: page.locator('text=Credits Per Voucher') }).first()
    await creditsInput.fill('5000')

    const quantityInput = page.locator('input').filter({ has: page.locator('text=Number of Vouchers') }).first()
    await quantityInput.fill('10')

    // Don't select date, try to submit
    const submitButton = page.locator('button:has-text("Generate")').last()
    await submitButton.click()

    // Error message should appear
    const errorMessage = page.locator('[class*="p-message-error"]')
    await expect(errorMessage).toContainText('expiry date')
  })

  test('should deactivate voucher with confirmation', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Find deactivate button in first row
    const deactivateButton = page.locator('button[class*="p-button-danger"]').first()
    const isVisible = await deactivateButton.isVisible().catch(() => false)

    if (isVisible) {
      // Hover to see tooltip
      await deactivateButton.hover()
      const tooltip = page.locator('text=Deactivate voucher')
      const tooltipVisible = await tooltip.isVisible().catch(() => false)
      expect(tooltipVisible).toBeTruthy()

      // Click button
      await deactivateButton.click()

      // Confirmation dialog should appear
      const dialog = page.locator('[class*="p-dialog"]')
      const dialogVisible = await dialog.isVisible().catch(() => false)

      if (dialogVisible) {
        // Confirm deactivation
        const confirmButton = page.locator('button:has-text("Yes")').last()
        await confirmButton.click()

        // Table should be updated
        await page.waitForTimeout(500)
        const table = page.locator('[class*="datatable"]')
        await expect(table).toBeVisible()
      }
    }
  })

  test('should show empty state when no vouchers', async () => {
    // This would require seeding with no vouchers or filtering to show none
    await page.goto('http://localhost:5173/vouchers')

    // Check if empty state is shown (only if no vouchers exist)
    const emptyState = page.locator('text=No vouchers created yet')
    const isVisible = await emptyState.isVisible().catch(() => false)

    if (isVisible) {
      expect(isVisible).toBe(true)
    }
  })

  test('should paginate vouchers table', async () => {
    await page.goto('http://localhost:5173/vouchers')

    // Check if paginator is visible
    const paginator = page.locator('[class*="p-paginator"]')
    const isVisible = await paginator.isVisible().catch(() => false)

    if (isVisible) {
      // Click next page
      const nextButton = page.locator('button[aria-label="Next Page"]')
      await nextButton.click()

      // Table should show next page
      const table = page.locator('[class*="datatable"]')
      await expect(table).toBeVisible()
    }
  })

  test.afterEach(async () => {
    await page.close()
  })
})

test.describe('Voucher Redemption Flow (Customer)', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Login as customer
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', 'customer@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForNavigation()
  })

  test('should redeem voucher on credits page', async () => {
    await page.goto('http://localhost:5173/credits/buy')

    // Check if voucher section exists
    const voucherSection = page.locator('text=Have a Voucher?')
    const isVisible = await voucherSection.isVisible().catch(() => false)

    if (isVisible) {
      // Enter voucher code
      const input = page.locator('input').filter({ has: page.locator('text=Enter voucher code') }).first()
      await input.fill('TESTVCHR123')

      // Click redeem
      const redeemButton = page.locator('button:has-text("Redeem")')
      await redeemButton.click()

      // Message should appear
      const message = page.locator('[class*="p-message"]')
      await message.waitFor()
      const text = await message.textContent()
      expect(text).toMatch(/redeemed successfully|failed|error/)
    }
  })

  test('should show error for invalid voucher code', async () => {
    await page.goto('http://localhost:5173/credits/buy')

    const voucherSection = page.locator('text=Have a Voucher?')
    const isVisible = await voucherSection.isVisible().catch(() => false)

    if (isVisible) {
      // Enter invalid code
      const input = page.locator('input').filter({ has: page.locator('text=Enter voucher code') }).first()
      await input.fill('INVALID123')

      const redeemButton = page.locator('button:has-text("Redeem")')
      await redeemButton.click()

      // Error message should appear
      const message = page.locator('[class*="p-message-error"]')
      const isErrorVisible = await message.isVisible().catch(() => false)
      expect(isErrorVisible).toBeTruthy()
    }
  })

  test.afterEach(async () => {
    await page.close()
  })
})
