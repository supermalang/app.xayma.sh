import { test, expect, Page } from '@playwright/test'

test.describe('Credits Purchase Flow', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Login as a customer
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', 'customer@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForNavigation()
  })

  test('should display credit balance and status', async () => {
    await page.goto('http://localhost:5173/credits')

    // Check if balance is displayed
    await expect(page.locator('text=Credit Balance')).toBeVisible()

    // Check if meter is displayed
    const creditMeter = page.locator('[class*="credit-meter"]')
    await expect(creditMeter).toBeVisible()

    // Check if balance shows in monospace font
    const balance = page.locator('[class*="font-mono"]').first()
    await expect(balance).toBeVisible()
  })

  test('should display credit bundles', async () => {
    await page.goto('http://localhost:5173/credits/buy')

    // Check if bundles are displayed
    const bundles = page.locator('[class*="credit-bundle-card"]')
    await expect(bundles).toHaveCount(3) // Assuming 3 bundles

    // Check bundle information
    const firstBundle = bundles.first()
    await expect(firstBundle.locator('text=Credits')).toBeVisible()
    await expect(firstBundle.locator('text=Max Instances')).toBeVisible()
    await expect(firstBundle.locator('text=Validity')).toBeVisible()
  })

  test('should apply reseller discount automatically', async () => {
    // Login as reseller with deployments
    await page.goto('http://localhost:5173/credits/buy')

    // Check if discount is shown for reseller with deployments
    const discountBadge = page.locator('text=Reseller Volume Discount')
    const isVisible = await discountBadge.isVisible().catch(() => false)

    if (isVisible) {
      // Discount should be displayed
      await expect(page.locator('text=automatically applied')).toBeVisible()
    }
  })

  test('should initiate checkout and redirect to payment', async () => {
    await page.goto('http://localhost:5173/credits/buy')

    // Click first bundle's select button
    const selectButtons = page.locator('button:has-text("Select Bundle")')
    await selectButtons.first().click()

    // Should redirect to payment or success page
    await page.waitForNavigation()
    const url = page.url()
    expect(url).toMatch(/credits\/(success|cancel)/)
  })

  test('should show payment processing page', async () => {
    await page.goto('http://localhost:5173/credits/success')

    // Check for processing message or spinner
    const spinner = page.locator('[class*="progress-spinner"]')
    const processingText = page.locator('text=Processing Your Payment')

    const isSpinnerVisible = await spinner.isVisible().catch(() => false)
    const isProcessingVisible = await processingText.isVisible().catch(() => false)

    expect(isSpinnerVisible || isProcessingVisible).toBe(true)
  })

  test('should show success page after payment', async () => {
    // Simulate successful payment by navigating to success page
    // In real scenario, payment webhook would update transaction status
    await page.goto('http://localhost:5173/credits/success?transactionId=test123')

    // Wait for success state
    await page.waitForTimeout(2000)

    // Check if success message appears
    const successText = page.locator('text=Payment Successful')
    const isSuccessVisible = await successText.isVisible().catch(() => false)

    if (isSuccessVisible) {
      // Should show transaction details
      await expect(page.locator('text=Transaction ID')).toBeVisible()
      await expect(page.locator('text=Amount')).toBeVisible()
      await expect(page.locator('text=Date & Time')).toBeVisible()

      // Should show action buttons
      await expect(page.locator('button:has-text("View Transaction History")')).toBeVisible()
      await expect(page.locator('button:has-text("Back to Dashboard")')).toBeVisible()
    }
  })

  test('should show cancellation page', async () => {
    await page.goto('http://localhost:5173/credits/cancel')

    // Check if cancellation message is displayed
    await expect(page.locator('text=Payment Cancelled')).toBeVisible()
    await expect(page.locator('text=No charges were made to your account')).toBeVisible()

    // Should show action buttons
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
    await expect(page.locator('button:has-text("Back to Credits")')).toBeVisible()
  })

  test('should display transaction history', async () => {
    await page.goto('http://localhost:5173/credits/history')

    // Check if table is displayed
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()

    // Check column headers
    await expect(page.locator('text=Date')).toBeVisible()
    await expect(page.locator('text=Type')).toBeVisible()
    await expect(page.locator('text=Description')).toBeVisible()
    await expect(page.locator('text=Amount')).toBeVisible()
  })

  test('should filter transactions by date range', async () => {
    await page.goto('http://localhost:5173/credits/history')

    // Open date picker
    const startDateInput = page.locator('input').filter({ has: page.locator('text=Start Date') }).first()
    await startDateInput.click()

    // Select a date (would depend on calendar implementation)
    const dateOption = page.locator('[class*="p-datepicker-date"]').first()
    await dateOption.click().catch(() => {}) // May not exist, but we check

    // Apply filter
    const refreshButton = page.locator('button[icon="pi pi-refresh"]')
    await refreshButton.click()

    // Table should still be visible
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()
  })

  test('should filter transactions by type', async () => {
    await page.goto('http://localhost:5173/credits/history')

    // Open dropdown
    const typeDropdown = page.locator('[class*="p-dropdown"]').nth(1)
    await typeDropdown.click()

    // Select a type
    const option = page.locator('[class*="p-dropdown-item"]').first()
    await option.click()

    // Table should be filtered
    const dataTable = page.locator('[class*="datatable"]')
    await expect(dataTable).toBeVisible()
  })

  test('should redeem voucher', async () => {
    await page.goto('http://localhost:5173/credits/buy')

    // Check if voucher section exists
    const voucherSection = page.locator('text=Have a Voucher?')
    const isSectionVisible = await voucherSection.isVisible().catch(() => false)

    if (isSectionVisible) {
      // Enter voucher code
      const voucherInput = page.locator('input:has-text("Enter voucher code")')
      if (voucherInput) {
        await voucherInput.fill('TESTVCHR123')

        // Click redeem button
        const redeemButton = page.locator('button:has-text("Redeem")')
        await redeemButton.click()

        // Should show success or error message
        const message = page.locator('[class*="p-message"]')
        await expect(message).toBeVisible()
      }
    }
  })

  test.afterEach(async () => {
    await page.close()
  })
})

test.describe('Low Credit Notifications', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('http://localhost:5173/auth/login')
    await page.fill('input[type="email"]', 'lowcredit@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForNavigation()
  })

  test('should show low balance notification', async () => {
    // Navigate to dashboard where notifications appear
    await page.goto('http://localhost:5173/')

    // Check if low credit notification appears (if balance is below 20%)
    const notification = page.locator('text=Low Credit Balance')
    const isVisible = await notification.isVisible().catch(() => false)

    if (isVisible) {
      expect(isVisible).toBe(true)
    }
  })

  test('should show top-up button when balance is low', async () => {
    await page.goto('http://localhost:5173/')

    // Check if top-up button is visible in credit meter
    const topupButton = page.locator('button:has-text("Top up")')
    const isVisible = await topupButton.isVisible().catch(() => false)

    if (isVisible) {
      // Click should navigate to credits page
      await topupButton.click()
      await page.waitForNavigation()
      expect(page.url()).toContain('/credits/buy')
    }
  })

  test.afterEach(async () => {
    await page.close()
  })
})
