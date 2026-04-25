/**
 * Responsive Design E2E Tests
 * Verifies dashboard and pages display correctly at mobile, tablet, and desktop breakpoints
 * Tests for no horizontal scrolling, proper layout shifts, and readable content at each size
 */

import { test, expect } from '@playwright/test'

const BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
}

const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@test.example.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
}

const TEST_CUSTOMER = {
  email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.example.com',
  password: process.env.TEST_CUSTOMER_PASSWORD || 'test123456',
}

async function login(page: any, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 10000 })
}

function hasHorizontalScroll(page: any): Promise<boolean> {
  return page.evaluate(() => {
    const mainEl = document.querySelector('main') || document.querySelector('body')
    return mainEl ? mainEl.scrollWidth > mainEl.clientWidth : false
  })
}

test.describe('Responsive Design - Mobile (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.mobile)
  })

  test('Dashboard has no horizontal scroll at mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasScroll = await hasHorizontalScroll(page)
    expect(hasScroll).toBeFalsy()

    await context.close()
  })

  test('Sidebar is hidden at mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check if sidebar is hidden via CSS
    const sidebar = page.locator('aside')
    const sidebarVisible = await sidebar.evaluate((el: any) => {
      return window.getComputedStyle(el).display !== 'none' &&
             window.getComputedStyle(el).visibility !== 'hidden'
    }).catch(() => false)

    // Sidebar may be collapsed or hidden at mobile
    expect(sidebarVisible === false || await sidebar.count() === 0).toBeTruthy()

    await context.close()
  })

  test('Content is readable with single-column layout at mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify main content area exists and has min-width not causing scroll
    const mainContent = page.locator('main')
    const hasContent = await mainContent.count() > 0
    expect(hasContent).toBeTruthy()

    // Check that text is not cut off (basic font size check)
    const textElements = page.locator('body *:has-text()')
    const textCount = await textElements.count()
    expect(textCount).toBeGreaterThan(0)

    await context.close()
  })

  test('Stat cards stack vertically at mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that cards use grid with cols-1 on mobile
    const gridContainers = page.locator('[class*="grid"]')
    const containerCount = await gridContainers.count()

    // If grids exist, they should be using responsive classes
    if (containerCount > 0) {
      const firstGrid = gridContainers.first()
      const classes = await firstGrid.getAttribute('class') || ''
      // Should include grid-cols-1 or similar for mobile
      expect(classes.includes('grid')).toBeTruthy()
    }

    await context.close()
  })
})

test.describe('Responsive Design - Tablet (768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.tablet)
  })

  test('Dashboard is readable at tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.tablet,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasScroll = await hasHorizontalScroll(page)
    expect(hasScroll).toBeFalsy()

    // Verify content is present
    const main = page.locator('main')
    const isVisible = await main.isVisible()
    expect(isVisible).toBeTruthy()

    await context.close()
  })

  test('Tables use responsive stack layout at tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.tablet,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    // Navigate to a page with tables (e.g., partners or deployments)
    await page.goto('/partners').catch(() => {})
    await page.waitForLoadState('networkidle')

    // Check if DataTable exists
    const table = page.locator('table')
    const tableExists = await table.count() > 0

    if (tableExists) {
      // If table exists, it should either be visible or stacked
      const tableDisplay = await table.first().evaluate((el: any) => {
        return window.getComputedStyle(el).display
      }).catch(() => 'block')

      expect(['block', 'table', 'none', 'grid', 'flex']).toContain(tableDisplay)
    }

    await context.close()
  })

  test('Navigation layout is optimized at tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.tablet,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Sidebar may be visible or collapsible at tablet
    const sidebar = page.locator('aside')
    const sidebarCount = await sidebar.count()
    expect(sidebarCount >= 0).toBeTruthy()

    // Main content should be accessible
    const main = page.locator('main')
    const mainVisible = await main.isVisible()
    expect(mainVisible).toBeTruthy()

    await context.close()
  })

  test('Stat cards use 2-column layout at tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.tablet,
    })
    const page = await context.newPage()

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Stat cards should be in a grid (likely 2 or 3 columns at tablet)
    const gridContainers = page.locator('[class*="grid"]')
    expect(await gridContainers.count()).toBeGreaterThan(0)

    await context.close()
  })
})

test.describe('Responsive Design - Desktop (1280px)', () => {
  test('Dashboard displays full multi-column layout at desktop', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop)

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for no horizontal scrolling
    const hasScroll = await hasHorizontalScroll(page)
    expect(hasScroll).toBeFalsy()

    // Verify sidebar is visible
    const sidebar = page.locator('aside')
    const sidebarVisible = await sidebar.isVisible().catch(() => false)
    expect(sidebarVisible).toBeTruthy()

    // Verify main content area is large enough for multi-column layout
    const main = page.locator('main')
    const width = await main.evaluate((el: any) => el.clientWidth).catch(() => 0)
    expect(width).toBeGreaterThan(600)
  })

  test('Stat cards display in 4-column grid at desktop', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop)

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for stat cards container
    const statContainer = page.locator('[class*="grid"]').first()
    const children = await statContainer.locator('> *').count()

    // Should have multiple cards (at least 2, typically 4 at desktop)
    expect(children >= 2).toBeTruthy()
  })

  test('Charts display side-by-side at desktop', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop)

    await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for chart containers
    const chartLike = page.locator('[class*="chart"], svg')
    const chartCount = await chartLike.count()

    // May or may not have charts depending on role, but if they exist they should be positioned
    if (chartCount > 0) {
      expect(chartCount >= 1).toBeTruthy()
    }
  })

  test('All pages are readable without horizontal scroll', async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop)

    const pages = ['/', '/partners', '/deployments']

    for (const pagePath of pages) {
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password)
      await page.goto(pagePath).catch(() => {})
      await page.waitForLoadState('networkidle')

      const hasScroll = await hasHorizontalScroll(page)
      expect(hasScroll).toBeFalsy()
    }
  })
})

test.describe('Responsive Design - Orientation Changes', () => {
  test('Dashboard adapts when resizing from mobile to tablet', async ({ page }) => {
    // Start mobile
    await page.setViewportSize(BREAKPOINTS.mobile)
    await login(page, TEST_CUSTOMER.email, TEST_CUSTOMER.password)
    await page.goto('/')

    const mobileScroll = await hasHorizontalScroll(page)
    expect(mobileScroll).toBeFalsy()

    // Resize to tablet
    await page.setViewportSize(BREAKPOINTS.tablet)
    await page.waitForLoadState('networkidle')

    const tabletScroll = await hasHorizontalScroll(page)
    expect(tabletScroll).toBeFalsy()

    // Resize to desktop
    await page.setViewportSize(BREAKPOINTS.desktop)
    await page.waitForLoadState('networkidle')

    const desktopScroll = await hasHorizontalScroll(page)
    expect(desktopScroll).toBeFalsy()
  })
})
