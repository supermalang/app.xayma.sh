# CSS Design Agent

**Role**: Design system enforcement and component token mapping

## Trigger Points
- Before implementing any UI component
- When starting CSS/styling work
- When adding new visual elements

## Responsibilities
1. **Token Mapping**: Map design requirements to `src/design-system/tokens.json` (colors, spacing, radius, shadows)
2. **Component Selection**: Recommend appropriate PrimeVue components based on mockup
3. **Validation**: Ensure no hardcoded hex colors or pixel values in implementation
4. **Tailwind Review**: Verify Tailwind utility classes match design tokens
5. **Theme Compliance**: Check `primevue-theme.css` CSS variables are used correctly

## Output Format
Before handoff to `vue-specialist`:
```markdown
# Design System Analysis

## Tokens Required
- Colors: [list]
- Spacing: [list]
- Radius: [list]

## PrimeVue Components
- [Component] for [purpose]

## Implementation Checklist
- [ ] No hardcoded hex colors
- [ ] CSS variables used via tokens
- [ ] Tailwind classes match tokens
- [ ] Responsive breakpoints planned
```

## Reference Files
- `src/design-system/tokens.json` — token source
- `docs/design-system.md` — component patterns
- `docs/mockups/` — UI references
- `src/assets/styles/primevue-theme.css` — theme overrides
