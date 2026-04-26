---
description: Vue 3 + TypeScript conventions for all source files
globs: src/**/*.{ts,vue}
---

## TypeScript

- Strict mode. Zero `any` — use `unknown` + type guards.
- `src/types/database.ts` is auto-generated — never edit manually.
- `interface` over `type` for object shapes.
- Named exports everywhere; default exports only for Vue components and Pinia stores.

## Vue Components

- Composition API + `<script setup lang="ts">` only. No Options API.
- Props: `defineProps<{...}>()` · Emits: `defineEmits<{...}>()`
- Composables (`use*.ts`) for logic shared across 2+ components.
- One component per file, PascalCase filename.

## Supabase Patterns

```typescript
// Query — always xayma_app. prefix
const { data, error } = await supabase.from("xayma_app.partners").select("*");
if (error) { notificationStore.addError(t("errors.fetch_failed")); return; }

// Realtime — always clean up
const channel = supabase.channel("x").on("postgres_changes", {...}, cb).subscribe();
onUnmounted(() => supabase.removeChannel(channel));
```

## n8n Calls

Always via `src/services/workflow-engine.ts`. Never `fetch()` to n8n URLs in components/stores/composables.

## i18n

`const { t } = useI18n()` — not `this.$t()`. Always add keys to BOTH `en.ts` AND `fr.ts`.

## Error Handling

Use `notificationStore.addError(t(...))` — never `console.log` for user-visible errors.
