# Claude Code Setup — Xayma.sh

## File Map

```
CLAUDE.md                          ← Always loaded. Core rules, architecture, agent routing.
.claude/
├── settings.json                  ← Hook configuration (deterministic enforcement)
├── hooks/
│   ├── lint-and-typecheck.sh      ← PostToolUse: ESLint + tsc after every .ts/.vue edit
│   ├── check-i18n-parity.sh       ← PostToolUse: en.ts/fr.ts key parity check
│   ├── guard-generated-files.sh   ← PreToolUse: blocks edits to database.ts
│   ├── guard-n8n-direct-calls.sh  ← PreToolUse: blocks direct n8n fetch() in src/
│   └── verify-task-reminder.sh    ← Stop: reminds Claude to run /verify-task
├── rules/
│   ├── vue-typescript.md          ← Loaded for: src/**/*.{ts,vue}
│   ├── ui-design.md               ← Loaded for: src/{components,pages}/**/*.vue
│   ├── services-backend.md        ← Loaded for: src/services/**/*.ts
│   ├── testing.md                 ← Loaded for: test files
│   └── new-feature-checklist.md   ← Loaded manually via /new-feature command
├── agents/                        ← css-design, vue-specialist, workflow-engine-specialist,
│                                     test-writer, pr-reviewer, lead
└── commands/                      ← /new-feature, /new-page, /verify-task, /test-sprint,
                                      /status, /visual-check, /workflow-engine, /db-migration
```

## How It Works

**CLAUDE.md** holds only what Claude needs in every single session: project summary, stack,
build commands, behavioral rules, architecture invariants, and agent routing.
Target: under 80 lines.

**Rules** (`.claude/rules/`) load automatically when Claude touches matching file paths.
Vue conventions load when editing `.vue`/`.ts` files. UI rules load for components and pages.
Service rules load for `src/services/`. This keeps context lean per task.

**Hooks** (`.claude/settings.json`) are deterministic — they run every time regardless of
what Claude "decides". They enforce:

- Lint + typecheck after every file edit (PostToolUse)
- i18n parity after translation file edits (PostToolUse)
- Blocks on protected files and architectural violations (PreToolUse)
- /verify-task reminder at turn end (Stop)

## What Hooks Cannot Do Alone

The `pr-reviewer` approval gate and `/verify-task` are advisory enforced via the agent flow,
not hooks. The Stop hook is a soft reminder only. For hard enforcement of the approval gate,
configure your CI pipeline to require PR review before merge.

## Updating This Setup

- Claude makes the same mistake twice → add it to the relevant rule file.
- A rule is never violated → Claude already knows it; delete it.
- Something must happen without exception → move it to a hook.
- A rule only applies to one part of the codebase → it belongs in a path-scoped rule, not CLAUDE.md.
