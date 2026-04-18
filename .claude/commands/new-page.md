# /new-page — Scaffold New Page

## Usage
```
/new-page 2.5
```

## Output
Scaffolds a new page with:
- Route definition with `requiredRole` meta
- Page component skeleton
- Layout context (AppLayout or AuthLayout)
- i18n keys placeholder (EN + FR)

## Steps

### 1. Read Task
Get page name, layout, and role requirements from IMPLEMENTATION_PLAN.md task N.

### 2. Create Route
```typescript
// src/router/index.ts
{
  path: '/partners',
  component: () => import('../pages/Partners.vue'),
  meta: {
    requiresAuth: true,
    requiredRole: 'ADMIN' // or 'CUSTOMER', 'RESELLER', 'SALES', 'SUPPORT'
  }
}
```

### 3. Create Page Component
```vue
<!-- src/pages/Partners.vue -->
<template>
  <AppPageHeader
    title="Pages.Partners"
    subtitle="pages.partners_subtitle"
  />
  <!-- content here -->
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
```

### 4. Add i18n Keys
```typescript
// src/i18n/en.ts
export default {
  pages: {
    partners: 'Partners',
    partners_subtitle: 'Manage your partner accounts',
  }
}

// src/i18n/fr.ts
export default {
  pages: {
    partners: 'Partenaires',
    partners_subtitle: 'Gérez vos comptes partenaires',
  }
}
```

### 5. Add to Navigation
If part of sidebar:
```typescript
// src/components/AppSidebar.vue
const menuItems = [
  {
    label: 'pages.partners',
    icon: 'pi pi-building',
    to: '/partners',
    visible: isAdmin() // conditional per role
  }
]
```

## Acceptance Criteria
- [ ] Route created with correct `requiredRole`
- [ ] Page component structure follows pattern
- [ ] i18n keys in both EN and FR
- [ ] Navigation updated if sidebar item
- [ ] Page accessible via route
- [ ] Role guard works (redirects unauthorized users)

## Related Commands
- `/new-feature` — Full feature (page + logic + tests)
- `/verify-task` — Self-check
