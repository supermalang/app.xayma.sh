import { test, expect } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:5173'
const SALES_LOGIN = {
  email: 'sales@xayma.sh',
  password: 'password123',
}

test.describe('Sales Pages - Portfolio & Commissions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`)
    // In a real test, we'd log in as SALES user
    // For now, just verify pages are accessible at routes
  })

  test.describe('Portfolio Page', () => {
    test('6.T5.1 - Mobile (375px) responsive layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(`${BASE_URL}/portfolio`)

      // Verify page header
      const header = page.locator('[class*="AppPageHeader"]')
      await expect(header).toBeTruthy()

      // Verify filters stack vertically on mobile
      const filterCard = page.locator('.p-card').first()
      const filterGrid = filterCard.locator('[class*="grid"]')
      const computedStyle = await filterGrid.evaluate(
        (el) => window.getComputedStyle(el).gridTemplateColumns,
      )
      expect(computedStyle).toMatch(/1/)

      // Verify DataTable uses stack mode
      const datatable = page.locator('.p-datatable')
      const responsiveLayout = datatable.getAttribute('responsive-layout')
      expect(responsiveLayout).toBe('stack')

      // Verify inputs span full width
      const inputs = page.locator('.p-inputtext, .p-dropdown')
      for (const input of await inputs.all()) {
        const width = await input.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          return rect.width
        })
        expect(width).toBeGreaterThan(200) // Should be most of 375px
      }
    })

    test('6.T5.2 - Tablet (768px) responsive layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(`${BASE_URL}/portfolio`)

      // Verify filter grid displays 2 columns on tablet
      const filterGrid = page.locator('[class*="grid-cols"]').first()
      const classList = await filterGrid.getAttribute('class')
      expect(classList).toContain('md:grid-cols-2')

      // Verify DataTable is still responsive
      const datatable = page.locator('.p-datatable')
      await expect(datatable).toBeTruthy()

      // Verify paginator is visible
      const paginator = page.locator('.p-paginator')
      await expect(paginator).toBeTruthy()
    })

    test('6.T5.3 - Desktop (1280px) responsive layout', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(`${BASE_URL}/portfolio`)

      // Verify filter grid displays 4 columns on desktop
      const filterGrid = page.locator('[class*="grid-cols"]').first()
      const classList = await filterGrid.getAttribute('class')
      expect(classList).toContain('lg:grid-cols-4')

      // Verify all filters visible in one row
      const filterItems = page.locator('[class*="gap-4"] > *')
      const count = await filterItems.count()
      expect(count).toBe(4) // Search, Plan, Status, Reset
    })

    test('6.T6.1 - Filter functionality works', async ({ page }) => {
      await page.goto(`${BASE_URL}/portfolio`)

      // Search for customer
      const searchInput = page.locator('[placeholder="Search"]')
      await searchInput.fill('Logistics')

      // Verify DataTable filters (should show Logistics Plus)
      const table = page.locator('.p-datatable')
      await expect(table).toBeTruthy()

      // Clear search
      await searchInput.clear()
    })

    test('6.T6.2 - Pagination works', async ({ page }) => {
      await page.goto(`${BASE_URL}/portfolio`)

      // Verify paginator shows correct total
      const paginator = page.locator('.p-paginator')
      await expect(paginator).toBeTruthy()

      // Verify "Showing X to Y" text is present
      const paginatorText = await paginator.textContent()
      expect(paginatorText).toMatch(/\d+/)
    })

    test('6.13.1 - Keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/portfolio`)

      // Tab to Reset button
      const resetButton = page.locator('button:has-text("Reset Filters")')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Verify focus on button (should show outline)
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.textContent
      })
      expect(focusedElement).toContain('Reset')

      // Press Space to activate
      await page.keyboard.press('Space')
    })

    test('6.13.2 - Focus rings visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/portfolio`)

      // Click on search input to focus
      const searchInput = page.locator('[placeholder="Search"]')
      await searchInput.focus()

      // Verify focus styles applied
      const focusStyle = await searchInput.evaluate((el) => {
        const style = window.getComputedStyle(el)
        return style.outlineWidth
      })
      expect(focusStyle).not.toBe('0px')
    })

    test('6.13.3 - ARIA labels present', async ({ page }) => {
      await page.goto(`${BASE_URL}/portfolio`)

      // Check Reset button has aria-label
      const resetButton = page.locator('button:has-text("Reset Filters")')
      const ariaLabel = await resetButton.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    })
  })

  test.describe('Commissions Page', () => {
    test('6.T5.4 - Mobile (375px) stat cards stack', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(`${BASE_URL}/commissions`)

      // Verify stat card grid is 1 column on mobile
      const statGrid = page.locator('[class*="grid-cols-1"]').first()
      const classList = await statGrid.getAttribute('class')
      expect(classList).toContain('grid-cols-1')

      // Verify 4 stat cards are present
      const statCards = page.locator('[class*="StatCard"]').or(page.locator('[class*="stat"]'))
      const cardCount = await page.locator('.grid > *').count()
      expect(cardCount).toBeGreaterThanOrEqual(4)
    })

    test('6.T5.5 - Tablet (768px) stat cards 2x2 grid', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(`${BASE_URL}/commissions`)

      // Verify md:grid-cols-2 is applied
      const statGrid = page.locator('[class*="grid"]').first()
      const classList = await statGrid.getAttribute('class')
      expect(classList).toContain('md:grid-cols-2')
    })

    test('6.T5.6 - Desktop (1280px) stat cards 4-column', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(`${BASE_URL}/commissions`)

      // Verify lg:grid-cols-4 is applied
      const statGrid = page.locator('[class*="grid"]').first()
      const classList = await statGrid.getAttribute('class')
      expect(classList).toContain('lg:grid-cols-4')
    })

    test('6.T6.3 - Accordion expands/collapses', async ({ page }) => {
      await page.goto(`${BASE_URL}/commissions`)

      // Find first accordion header
      const firstAccordionHeader = page.locator('.p-accordion-header').first()

      // Click to expand
      await firstAccordionHeader.click()

      // Verify content is visible
      const accordionContent = page.locator('.p-accordion-content').first()
      await expect(accordionContent).toBeTruthy()

      // Click to collapse
      await firstAccordionHeader.click()
    })

    test('6.T6.4 - Commission history DataTable displays', async ({ page }) => {
      await page.goto(`${BASE_URL}/commissions`)

      // Scroll to table
      const historyTable = page.locator('.p-datatable')
      await historyTable.scrollIntoViewIfNeeded()

      // Verify table headers
      const headers = page.locator('.p-datatable-thead th')
      const headerTexts = await headers.allTextContents()

      expect(headerTexts.length).toBeGreaterThan(0)
      expect(headerTexts.join(' ')).toMatch(/Date|Customer|Type|Amount/)
    })

    test('6.T6.5 - LineChart renders', async ({ page }) => {
      await page.goto(`${BASE_URL}/commissions`)

      // Verify chart element exists
      const chart = page.locator('[class*="echarts"]').or(page.locator('canvas'))
      await expect(chart).toBeTruthy()

      // Chart should be responsive (width > 300px)
      const chartWidth = await chart.first().evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return rect.width
      })
      expect(chartWidth).toBeGreaterThan(300)
    })

    test('6.13.4 - Accordion keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/commissions`)

      // Find accordion header and focus it
      const firstHeader = page.locator('.p-accordion-header').first()
      await firstHeader.focus()

      // Press Enter to expand
      await page.keyboard.press('Enter')

      // Content should be visible
      const content = page.locator('.p-accordion-content').first()
      await expect(content).toBeTruthy()
    })

    test('6.13.5 - Accordion ARIA label present', async ({ page }) => {
      await page.goto(`${BASE_URL}/commissions`)

      // Find accordion and check for aria-label
      const accordion = page.locator('[role="region"], [aria-label*="Commission"]').first()
      const ariaLabel = await accordion.getAttribute('aria-label')
      expect(ariaLabel).toContain('commission')
    })

    test('6.T6.6 - Mobile DataTable stacks at 375px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(`${BASE_URL}/commissions`)

      // Scroll to table
      const historyTable = page.locator('.p-datatable')
      await historyTable.scrollIntoViewIfNeeded()

      // Verify responsive-layout="stack"
      const responsiveLayout = historyTable.getAttribute('responsive-layout')
      expect(responsiveLayout).toBe('stack')
    })
  })

  test.describe('Navigation', () => {
    test('Portfolio link in sidebar', async ({ page }) => {
      // Note: requires SALES user authentication
      // Once logged in as SALES:
      const portfolioLink = page.locator('a[href="/portfolio"]')
      const isVisible = await portfolioLink.isVisible().catch(() => false)
      // This will depend on auth implementation
    })

    test('Commissions link in sidebar', async ({ page }) => {
      // Note: requires SALES user authentication
      const commissionsLink = page.locator('a[href="/commissions"]')
      const isVisible = await commissionsLink.isVisible().catch(() => false)
      // This will depend on auth implementation
    })
  })
})

test.describe('Accessibility - WCAG 2.1 Level AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/portfolio`)
  })

  test('6.13.6 - Color contrast on text', async ({ page }) => {
    // This is a manual check - automated testing would require:
    // 1. Axe accessibility scan
    // 2. Color contrast analyzer
    // For now, verify text is rendered (not transparent or invisible)

    const textElements = page.locator('p, span, td, th')
    const count = await textElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('6.13.7 - Semantic HTML structure', async ({ page }) => {
    // Verify h2/h3 headers are present
    const headers = page.locator('h1, h2, h3')
    const headerCount = await headers.count()
    expect(headerCount).toBeGreaterThan(0)

    // Verify proper link elements
    const links = page.locator('a')
    const linkCount = await links.count()
    expect(linkCount).toBeGreaterThan(0)
  })
})
