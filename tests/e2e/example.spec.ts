import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Xayma/)
  })
})
