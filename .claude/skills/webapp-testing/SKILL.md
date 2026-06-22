---
name: webapp-testing
description: Drive the running app in a real browser to verify behaviour live — capture screenshots, inspect the rendered DOM, and read console/network logs. Throwaway exploratory verification with Playwright, NOT a committed test suite. Use to confirm a UI change works, reproduce a visual bug, or grab reference screenshots for review.
---

# /webapp-testing — Live App Verification Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Role

Drives the **running** application in a headless or headed browser to observe what actually renders — screenshots, DOM state, console errors, network responses. This is **exploratory, throwaway verification**, not regression testing. It answers "does this work right now, and what does it look like?" The durable, committed E2E specs are owned by `/test-writer`; this skill never writes to the E2E suite.

It exists so `/qa-tester`, `/ux-review`, and `/debugger` have a concrete way to *see* the live app instead of reasoning about source alone.

## Permissions

✅ CAN read    : all project files
✅ CAN write   : **throwaway** verification scripts and screenshots under `.scratch/webapp-testing/` only
✅ CAN run     : the dev server · Playwright scripts · screenshot capture
❌ CANNOT      : write to `tests/e2e/` or any committed test file (that's `/test-writer`)
❌ CANNOT      : modify source, schema, `docs/ROADMAP.md`, or fix bugs (report and escalate to `/coder` / `/debugger`)
❌ CANNOT      : commit the scratch artifacts — they are ephemeral by design

> The `.scratch/` directory is throwaway. Add it to `.gitignore` if it is not already ignored. Never stage screenshots or scratch scripts in a task commit.

## Prerequisites

- Playwright is installed (it is the project's E2E tool — see `.claude/context.md`). If browsers are missing, run the project's Playwright install step first.
- The dev/build command is known from `.claude/context.md`.

---

## Step-by-step

Follow a **reconnaissance-then-action** loop — never act on a selector you haven't confirmed exists in the live DOM.

### 1 — Start the app

Start the dev server using the command in `.claude/context.md` (run it in the background and capture the URL/port). If it is already running, reuse it. Note the base URL.

### 2 — Reconnaissance: see what actually renders

Write a throwaway script to `.scratch/webapp-testing/verify.ts` that navigates to the target route and **waits for the app to settle** before inspecting:

```ts
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

// Surface client-side problems immediately
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()) })
page.on('pageerror', e => console.log('PAGE ERROR:', e.message))
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()) })

await page.goto(`${BASE}/your-route`)
await page.waitForLoadState('networkidle') // CRITICAL for dynamic / data-driven pages

await page.screenshot({ path: '.scratch/webapp-testing/recon.png', fullPage: true })
console.log(await page.content())          // inspect the rendered DOM to find real selectors

await browser.close()
```

Run it, read the screenshot and DOM, and note the **actual** selectors, text, and any console/network errors.

### 3 — Action: exercise the behaviour

Using selectors confirmed in step 2, script the interaction (click, fill, submit), then assert what the user would see — visible text, a status badge, a toast, an HTTP status. Prefer role/label selectors (`getByRole`, `getByLabel`) over brittle CSS, to match accessibility conventions. Screenshot the result.

### 4 — Authenticated / scoped routes

Most routes require a session. Reach the authenticated state the way the E2E helpers do (see `.claude/context.md` / `tests/e2e/` helpers) — log in through the UI or seed a session. **Never** hardcode credentials in the scratch script; read them from env. Respect the project's data-isolation rules — verify against the intended tenant/context only.

### 5 — Report

```
🖥️  Route        : /your-route   (base: http://localhost:3000)
📸 Screenshots  : .scratch/webapp-testing/recon.png, result.png
✅ Observed      : <what rendered / what the interaction produced>
🔴 Console/network errors : <list, or none>
⚠️  Discrepancy  : <expected vs observed, if any>
➡️  Handoff      : /debugger (if a bug) · /coder (if behaviour missing) · back to caller
```

### 6 — Clean up

Leave `.scratch/webapp-testing/` artifacts for the caller to inspect, but never commit them. Stop the dev server if you started it.

---

## How callers use this

- **`/ux-review`** → capture live reference screenshots of edited pages before reviewing the 7 dimensions, instead of reasoning from `.vue` alone.
- **`/qa-tester`** → reproduce each UAT scenario in the live browser and confirm the rendered result matches the acceptance criteria.
- **`/debugger`** → reproduce a UI bug in the browser and capture the failing state + console errors before isolating the root cause.

## What webapp-testing does NOT do

- Does not write or modify committed E2E specs (`/test-writer`).
- Does not fix code (`/coder`, `/debugger`).
- Does not produce regression coverage — its scripts and screenshots are disposable.
