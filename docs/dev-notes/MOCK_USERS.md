# Mock Users for Testing

When `VITE_MOCK_AUTH=true` in `.env`, use these credentials to test different user roles:

| Email | Password | Role | Name |
|-------|----------|------|------|
| `admin@test.example.com` | `test123456` | ADMIN | Admin User |
| `customer@test.example.com` | `test123456` | CUSTOMER | Customer User |
| `reseller@test.example.com` | `test123456` | RESELLER | Reseller User |
| `sales@test.example.com` | `test123456` | SALES | Sales User |
| `support@test.example.com` | `test123456` | SUPPORT | Support User |

---

## How to Use

1. **Make sure mock mode is enabled** in `.env`:
   ```env
   VITE_MOCK_AUTH=true
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Go to the login page**:
   ```
   http://localhost:5173/auth/login
   ```

4. **Enter any email/password from the table above**. For example:
   - Email: `admin@test.example.com`
   - Password: `test123456`

5. **You'll be logged in** with that role. Console will show:
   ```
   ✅ Logged in as ADMIN: admin@test.example.com
   ```

---

## Testing Different Roles

Test the app with different permissions by logging in as:
- **ADMIN** — Full system access
- **CUSTOMER** — Standard user (view own deployments, credits)
- **RESELLER** — Manage customers under them
- **SALES** — Sales team role
- **SUPPORT** — Support team role

---

## When to Disable Mock Mode

When ready to use real database service credentials:
1. Update `.env`:
   ```env
   VITE_MOCK_AUTH=false
   VITE_SUPABASE_URL=https://your-project.database service.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```

2. Restart `npm run dev`

3. Use real database service auth for login
