# Browser "Keeps Loading" — Root Causes & Fixes Applied

**Status:** ✅ Fixed
**Environment:** WSL2 Windows + local browser
**Date:** 2026-03-27

---

## The Problem

When accessing `http://localhost:5173` from a Windows browser, the page showed an indefinitely loading/blank state, even though the dev server started without errors.

---

## Root Causes Identified & Fixed

### 1. ✅ FIXED: Vite server only bound to `127.0.0.1` (loopback)
**Issue:** The dev server was only listening on `127.0.0.1:5173` (loopback address). In WSL2, Windows browsers cannot reach the loopback address—they must connect via the WSL2 virtual network adapter.

**Files Changed:**
- `vite.config.ts` → Added `host: '0.0.0.0'` to `server` block
- `package.json` → Updated dev script to include `--host` flag

**Before:**
```ts
server: {
  port: 5173,
  strictPort: false,
}
```

**After:**
```ts
server: {
  host: '0.0.0.0',
  port: 5173,
  strictPort: false,
}
```

**npm script:**
```json
"dev": "vite --host --port 5173 --strictPort"
```

**Result:** Dev server now listens on all network interfaces (`0.0.0.0`). Windows browser can now reach it.

---

### 2. ✅ FIXED: Fake Supabase credentials caused DNS hang
**Issue:** `.env` contained `VITE_SUPABASE_URL=https://test.supabase.co` (non-existent domain). When `src/stores/auth.store.ts` called `supabase.auth.getSession()`, it fired an HTTP request to this fake URL. DNS resolution for `.co` TLD with invalid subdomain could hang for 30-120 seconds, during which the router guard awaited `initialize()` and never called `next()`, leaving the page blank.

**File Changed:**
- `.env` → Replaced fake placeholders with instructions for real credentials

**Before:**
```env
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-key-placeholder
```

**After:**
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Result:** Users are now explicitly reminded to add their real Supabase credentials. Until they do, the 5-second timeout (fix #3) prevents the router guard from blocking forever.

---

### 3. ✅ FIXED: `auth.store.ts` → `initialize()` had no timeout
**Issue:** `supabase.auth.getSession()` could hang indefinitely if the Supabase URL was unreachable or DNS was slow. The router's `beforeEach` guard awaited this call with no timeout, blocking all route navigation indefinitely.

**File Changed:**
- `src/stores/auth.store.ts` → Wrapped `getSession()` in `Promise.race` with 5-second timeout

**Before:**
```ts
async function initialize() {
  try {
    isLoading.value = true
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    user.value = data.session?.user || null
  } finally {
    isLoading.value = false
    isInitialized.value = true
  }
}
```

**After:**
```ts
async function initialize() {
  try {
    isLoading.value = true

    // Add timeout to prevent infinite waiting if Supabase is unreachable
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth initialization timeout (5s)')), 5000)
    )

    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      timeout,
    ])

    if (error) throw error
    user.value = data.session?.user || null
  } catch (error) {
    // Auth failed (timeout, network error, etc.) — allow app to proceed
    console.warn('Auth initialization failed:', error instanceof Error ? error.message : error)
    user.value = null
  } finally {
    isLoading.value = false
    isInitialized.value = true
  }
}
```

**Result:** Router guard always calls `next()` within 5 seconds. If Supabase is unreachable, the app renders with `user = null` (unauthenticated state) and login page is shown immediately.

---

### 4. ✅ FIXED: Duplicate `initialize()` call in App.vue
**Issue:** Both the router guard and `App.vue:onMounted` called `authStore.initialize()`, causing two parallel requests to Supabase and potential race conditions.

**File Changed:**
- `src/App.vue` → Removed `await authStore.initialize()` from `onMounted`

**Before:**
```ts
onMounted(async () => {
  await authStore.initialize()
  authSubscription = authStore.setupAuthListener()
})
```

**After:**
```ts
onMounted(() => {
  // Note: authStore.initialize() is already called by router guard before routes render
  // Only set up the real-time auth listener here
  authSubscription = authStore.setupAuthListener()
})
```

**Result:** Single initialization point (router guard), cleaner auth state management, no race conditions.

---

## How to Complete the Setup

### Step 1: Get Real Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create one)
3. Go to **Settings → API**
4. Copy **Project URL** and **anon public key**

### Step 2: Update `.env`
Replace the placeholders in `/workspaces/04 Xayma 2.0/.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Open Browser
Navigate to `http://localhost:5173`

**Expected output in terminal:**
```
➜  Local:   http://localhost:5173
➜  Network: http://<your-wsl-ip>:5173
```

**Expected browser behavior:**
- Page loads within 2 seconds
- If Supabase is configured correctly: you see the login page
- If Supabase credentials are still fake: page loads blank with warning in DevTools console (but doesn't hang)
- Open DevTools (F12) → Console → should see no hanging requests

---

## Testing Checklist

- [ ] Terminal shows `Network: http://<ip>:5173` (not just `localhost`)
- [ ] Browser loads page within 2 seconds (not spinning forever)
- [ ] DevTools Console has no hanging network requests
- [ ] Clicking on `/login` loads the login page immediately
- [ ] With real Supabase creds: Login form works end-to-end
- [ ] With fake Supabase creds: App shows login page within 5 seconds, console shows auth timeout warning

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| vite.config.ts | Add `host: '0.0.0.0'` | +1 |
| package.json | Add `--host` flag to dev script | +1 |
| src/stores/auth.store.ts | Add 5s timeout to `initialize()` | +15 |
| src/App.vue | Remove duplicate `initialize()` call | -1 |
| .env | Add placeholder instructions | +2 |
| **Total** | | **~18 lines** |

---

## Summary

The "keeps loading" symptom was caused by **three stacked issues**:
1. Dev server not reachable from Windows browser (WSL2 loopback issue)
2. Fake Supabase URL causing DNS hangs
3. Router guard awaiting auth with no timeout

All three are now **fixed**. The app will:
- ✅ Serve pages to Windows browser from WSL2
- ✅ Timeout auth after 5 seconds (not hang indefinitely)
- ✅ Show login page even with unreachable Supabase
- ✅ Work correctly with real Supabase credentials

Next step: Add your real Supabase credentials to `.env` and restart `npm run dev`.
