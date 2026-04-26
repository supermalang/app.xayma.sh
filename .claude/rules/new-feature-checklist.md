---
description: Checklist for adding any new feature end-to-end
globs: null
---

# New Feature Checklist

Run through this for every `/new-feature` invocation before marking complete.

- [ ] Type definition in `src/types/index.ts`
- [ ] Service function in `src/services/`
- [ ] Pinia store action or composable
- [ ] Route in `src/router/index.ts` with `requiredRole` meta
- [ ] Page component in `src/pages/`
- [ ] i18n keys in both `src/i18n/en.ts` AND `src/i18n/fr.ts`
- [ ] Reference design checked in `docs/mockups/`
- [ ] Audit trigger added if new table introduced
- [ ] Unit test co-located with implementation
- [ ] `/verify-task` passes
- [ ] `pr-reviewer` APPROVED
