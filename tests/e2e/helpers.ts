import type { Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com'
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'test123456'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button:has-text("Login")')
  await page.waitForURL('/')
}
