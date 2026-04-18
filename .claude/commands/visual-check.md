# /visual-check — Screenshot Comparison vs Mockup

## Usage
```
/visual-check [page-name]
```

## Examples
```
/visual-check partners-list      # Compare partners list page
/visual-check deployment-card    # Compare deployment card component
/visual-check dashboard          # Compare full dashboard
```

## Purpose
Take a screenshot of implemented UI and compare pixel-for-pixel with mockup reference.

## Process

### 1. Capture Screenshot
```bash
# Via Playwright (automated)
npx playwright test --update-snapshots
```

### 2. Compare to Mockup Reference
- Compare new screenshot to reference in `tests/screenshots/`
- Check for:
  - Layout alignment (grid, spacing)
  - Color accuracy (design tokens applied)
  - Typography (font size, weight, line height)
  - Component styling (borders, shadows, radius)
  - Responsive behavior (mobile, tablet, desktop)

### 3. Generate Diff
Side-by-side comparison:
```
┌─ Mockup (Reference)     ┌─ Implementation ────┐
│                         │                     │
│ [Colors match] ✅       │ [Colors match] ✅   │
│ [Spacing OK] ✅         │ [Spacing OK] ✅     │
│ [Typography] ✅         │ [Typography] ✅     │
│ [Radius] ✅             │ [Radius] ✅         │
│                         │                     │
└─────────────────────────└─────────────────────┘
```

### 4. Identify Issues
If differences found:
```markdown
## Visual Issues Found

### Issue 1: Button Color Mismatch
- **Expected**: Primary blue (#3B82F6)
- **Actual**: Lighter blue (#60A5FA)
- **Cause**: CSS variable override not applied
- **Fix**: Check primevue-theme.css for --p-primary-color

### Issue 2: Card Shadow
- **Expected**: md shadow (0 4px 6px ...)
- **Actual**: No shadow
- **Cause**: Tailwind shadow class not applied
- **Fix**: Add shadow-md to card element
```

### 5. Fix & Verify
- Make CSS/design token changes
- Re-run `/visual-check` to confirm
- Commit screenshot to `tests/screenshots/`

## Output Format

```markdown
# Visual Check — Partners List Page

## Comparison Result: ✅ PASS

### Desktop (1920x1080)
- Layout: ✅ MATCH
- Colors: ✅ MATCH
- Typography: ✅ MATCH
- Spacing: ✅ MATCH
- Components: ✅ MATCH

### Tablet (768x1024)
- Layout: ✅ MATCH
- Responsive grid: ✅ MATCH

### Mobile (375x667)
- Layout: ✅ MATCH
- Single column: ✅ MATCH
- Touch targets: ✅ MATCH

## Screenshots
- Desktop: `tests/screenshots/partners-list-desktop.png` ✅
- Tablet: `tests/screenshots/partners-list-tablet.png` ✅
- Mobile: `tests/screenshots/partners-list-mobile.png` ✅

## Token Verification
- Colors: 100% match design tokens
- Spacing: 100% match design tokens
- Radius: 100% match design tokens
- Shadows: 100% match design tokens

## Status
✅ **VISUAL APPROVAL** — Ready for commit
```

If issues found:
```markdown
# Visual Check — Deployment Card

## Comparison Result: ❌ FAIL (2 Issues)

### Issues Found
1. **Border color mismatch**
   - Expected: Neutral 200 (#E5E7EB)
   - Actual: Neutral 300 (#D1D5DB)
   - File: src/components/deployments/DeploymentCard.vue
   - Fix: `border: 1px solid var(--neutral-200)`

2. **Shadow not applied**
   - Expected: md shadow on hover
   - Actual: No shadow
   - File: src/components/deployments/DeploymentCard.vue
   - Fix: Add `hover:shadow-md` class

## Action Required
1. Fix issues above
2. Re-run `/visual-check deployment-card`
3. Commit updated screenshot
```

## Screenshot Storage
All screenshots committed to `tests/screenshots/`:
```
tests/screenshots/
├── partners-list-desktop.png
├── partners-list-tablet.png
├── partners-list-mobile.png
├── deployment-card-desktop.png
├── dashboard-admin.png
└── ...
```

## Acceptance Criteria
- ✅ Colors match design tokens (hex values)
- ✅ Spacing matches design system
- ✅ Components match PrimeVue styling
- ✅ Responsive breakpoints correct
- ✅ No layout shifts
- ✅ Typography sizes/weights correct
- ✅ Shadows match design tokens

## Related Commands
- `/new-feature` — Auto-includes visual-check
- `/test-sprint` — Includes visual regression suite
- `npm run test:e2e` — Can capture screenshots
