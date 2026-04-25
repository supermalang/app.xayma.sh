/**
 * Dashboard Screenshots E2E Tests
 * Captures dashboard and key pages at multiple viewports for visual regression testing
 * Screenshots saved to tests/screenshots/ for comparison and documentation
 */

import { test } from '@playwright/test'
import * as path from 'path'
import { mkdir } from 'fs/promises'

const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
    name: 'admin',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'test123456',
    name: 'customer',
  },
  reseller: {
    email: process.env.TEST_RESELLER_EMAIL || 'reseller@test.example.com',
    password: process.env.TEST_RESELLER_PASSWORD || 'test123456',
    name: 'reseller',
  },
  sales: {
    email: process.env.TEST_SALES_EMAIL || 'sales@test.example.com',
    password: process.env.TEST_SALES_PASSWORD || 'test123456',
    name: 'sales',
  },
}

const BREAKPOINTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1280, height: 720, name: 'desktop' },
}

const SCREENSHOTS_DIR = path.join(process.cwd(), 'tests/screenshots')

async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (e) {
    // Directory may already exist
  }
}

async function login(page: any, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 10000 })
}

test.describe('Dashboard Screenshots', () => {
  test.beforeAll(async () => {
    await ensureDir(SCREENSHOTS_DIR)
  })

  // Admin Dashboard Screenshots
  for (const [bpKey, bpVal] of Object.entries(BREAKPOINTS)) {
    test(`Admin dashboard screenshot at ${bpVal.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bpVal.width, height: bpVal.height },
      })
      const page = await context.newPage()

      try {
        await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Wait for charts and data to render
        await page.waitForTimeout(1000)

        const screenshotPath = path.join(
          SCREENSHOTS_DIR,
          `admin-dashboard-${bpVal.name}.png`
        )

        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        })

        console.log(`✓ Captured admin dashboard at ${bpVal.name}`)
      } finally {
        await context.close()
      }
    })
  }

  // Customer Dashboard Screenshots
  for (const [bpKey, bpVal] of Object.entries(BREAKPOINTS)) {
    test(`Customer dashboard screenshot at ${bpVal.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bpVal.width, height: bpVal.height },
      })
      const page = await context.newPage()

      try {
        await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Wait for credit meter and data to render
        await page.waitForTimeout(1000)

        const screenshotPath = path.join(
          SCREENSHOTS_DIR,
          `customer-dashboard-${bpVal.name}.png`
        )

        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        })

        console.log(`✓ Captured customer dashboard at ${bpVal.name}`)
      } finally {
        await context.close()
      }
    })
  }

  // Reseller Dashboard Screenshots
  for (const [bpKey, bpVal] of Object.entries(BREAKPOINTS)) {
    test(`Reseller dashboard screenshot at ${bpVal.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bpVal.width, height: bpVal.height },
      })
      const page = await context.newPage()

      try {
        await login(page, TEST_USERS.reseller.email, TEST_USERS.reseller.password)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Wait for deployments table and data to render
        await page.waitForTimeout(1000)

        const screenshotPath = path.join(
          SCREENSHOTS_DIR,
          `reseller-dashboard-${bpVal.name}.png`
        )

        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        })

        console.log(`✓ Captured reseller dashboard at ${bpVal.name}`)
      } finally {
        await context.close()
      }
    })
  }

  // Sales Dashboard Screenshots
  for (const [bpKey, bpVal] of Object.entries(BREAKPOINTS)) {
    test(`Sales dashboard screenshot at ${bpVal.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bpVal.width, height: bpVal.height },
      })
      const page = await context.newPage()

      try {
        await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Wait for portfolio stats to render
        await page.waitForTimeout(1000)

        const screenshotPath = path.join(
          SCREENSHOTS_DIR,
          `sales-dashboard-${bpVal.name}.png`
        )

        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        })

        console.log(`✓ Captured sales dashboard at ${bpVal.name}`)
      } finally {
        await context.close()
      }
    })
  }

  // Commissions Page Screenshot (desktop only - complex page)
  test('Commissions page screenshot at desktop', async ({ browser }) => {
    const bpVal = BREAKPOINTS.desktop
    const context = await browser.newContext({
      viewport: { width: bpVal.width, height: bpVal.height },
    })
    const page = await context.newPage()

    try {
      await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
      await page.goto('/commissions').catch(() => {
        // Page may not exist in test environment
        console.warn('Commissions page not found, skipping')
      })
      await page.waitForLoadState('networkidle')

      // Wait for commission data to load
      await page.waitForTimeout(1000)

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'commissions-desktop.png'
      )

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log('✓ Captured commissions page at desktop')
    } finally {
      await context.close()
    }
  })

  // Partners/Deployments Tables at Multiple Viewports
  test('Partners page at mobile (375px)', async ({ browser }) => {
    const bpVal = BREAKPOINTS.mobile
    const context = await browser.newContext({
      viewport: { width: bpVal.width, height: bpVal.height },
    })
    const page = await context.newPage()

    try {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/partners').catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'partners-mobile.png'
      )

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log('✓ Captured partners page at mobile')
    } finally {
      await context.close()
    }
  })

  test('Partners page at desktop (1280px)', async ({ browser }) => {
    const bpVal = BREAKPOINTS.desktop
    const context = await browser.newContext({
      viewport: { width: bpVal.width, height: bpVal.height },
    })
    const page = await context.newPage()

    try {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/partners').catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'partners-desktop.png'
      )

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log('✓ Captured partners page at desktop')
    } finally {
      await context.close()
    }
  })

  test('Deployments page at mobile (375px)', async ({ browser }) => {
    const bpVal = BREAKPOINTS.mobile
    const context = await browser.newContext({
      viewport: { width: bpVal.width, height: bpVal.height },
    })
    const page = await context.newPage()

    try {
      await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
      await page.goto('/deployments').catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'deployments-mobile.png'
      )

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log('✓ Captured deployments page at mobile')
    } finally {
      await context.close()
    }
  })

  test('Deployments page at desktop (1280px)', async ({ browser }) => {
    const bpVal = BREAKPOINTS.desktop
    const context = await browser.newContext({
      viewport: { width: bpVal.width, height: bpVal.height },
    })
    const page = await context.newPage()

    try {
      await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
      await page.goto('/deployments').catch(() => {})
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'deployments-desktop.png'
      )

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      })

      console.log('✓ Captured deployments page at desktop')
    } finally {
      await context.close()
    }
  })
})
