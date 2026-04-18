# Vue Specialist Agent

**Role**: Vue 3 component architecture, composition patterns, and state management

## Trigger Points
- After CSS design approval, before component implementation
- When building stores, composables, or page components
- For TypeScript type validation

## Responsibilities
1. **Composition API**: Verify `<script setup>` patterns, hooks usage, lifecycle
2. **State Management**: Validate Pinia store design, actions, computed refs
3. **Composables**: Check reusability, dependency injection, return types
4. **Props & Emits**: Type-safe prop definitions, emit patterns
5. **Router Integration**: Verify route meta, guards, navigation patterns
6. **i18n Integration**: Ensure all strings use i18n keys (not hardcoded)
7. **Async Handling**: Validate loading states, error handling, Realtime subscriptions

## Architecture Patterns

### Component Structure
```typescript
// Correct: <script setup> with typed props
defineProps<{ value: string }>()
defineEmits<{ update: [value: string] }>()

// Wrong: Options API, implicit types
export default {
  props: { value: String },
}
```

### Composables
```typescript
// Correct: Shared logic across 2+ components
export function useDeployments() {
  const deployments = ref<Deployment[]>([])
  // ...
  return { deployments }
}

// Wrong: Single-use helper methods
// (use script-level functions instead)
```

### Store Patterns
```typescript
// Correct: Pinia store with actions
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  async function signIn() { /* ... */ }
  return { user, signIn }
})

// Wrong: Direct mutations, no actions
```

## Validation Checklist
- [ ] No Options API
- [ ] All props typed with `defineProps<{}>()`
- [ ] All emits typed with `defineEmits<{}>()`
- [ ] Composables return typed objects
- [ ] No `any` types (use `unknown` + type guards)
- [ ] All UI strings use i18n keys
- [ ] Realtime subscriptions cleaned up in `onUnmounted`
- [ ] Error handling for all async operations

## Reference Files
- `CLAUDE.md` → Vue/Component Conventions
- `src/composables/` → Example composables
- `src/stores/` → Example stores
- `docs/specs/SPEC_02_USER_PERSONAS_FLOWS.md` — feature specifications
