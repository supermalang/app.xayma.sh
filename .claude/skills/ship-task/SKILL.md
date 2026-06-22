---
name: ship-task
description: Autonomous end-to-end pipeline that ships a roadmap task to a PR. Validates DoR, creates branch, runs schema/coder/test-writer/docs/reviews/PR agents in the correct order with automatic skip logic. Human touchpoints only on DoR failure, test failure, and final PR URL. Usage: /ship-task <TASK-ID> (e.g. /ship-task 10.3).
---

# ship-task — Autonomous Task Pipeline

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : all project files
✅ CAN run     : Workflow tool — invoking `/ship-task` is explicit multi-agent opt-in
✅ CAN delegate: all pipeline agent skills (schema-agent, coder, test-writer, debugger, docs, ux-review, perf-review, perf-measure, qa-tester, security-audit, dep-audit, pr-reviewer)
❌ CANNOT      : implement code directly — delegates to `/coder`
❌ CANNOT      : merge PRs — returns PR URL for human review
❌ CANNOT      : mark task [x] without all DoD criteria met

---

## How to use

```
/ship-task 10.3
```

The task ID must match an entry in `docs/ROADMAP.md`. If the task does not exist, stop and tell the user to run `/planner` first.

---

## Pipeline overview

| Step | Agent | Runs when |
|------|-------|-----------|
| 0 | Validate | Always — reads roadmap, checks DoR; **stops if not met** |
| 1 | Setup | Always — writes `.current-task`, creates feature branch |
| 2 | Schema | `impactSchema = "Migration"` only |
| 3 | Test Writer (RED) | Always — writes tests from criteria, confirms they **fail** |
| 4 | Coder | Always — implements until RED tests turn green |
| 5 | Test Writer (GREEN) | Always — re-runs same tests |
| 5b | Debugger (self-repair) | If GREEN fails — auto root-causes and fixes, re-runs; up to 2 attempts before handing to a human |
| 6 | Docs | Task touches API, schema, or UI — updates README/API/CHANGELOG before the commit |
| 7 | Commit | Always — lint + commit implementation + tests + docs; recovery checkpoint |
| 8 | UX Review | Task touches UI components or pages [PROJECT CONVENTION — see .claude/context.md] |
| 9 | Perf Review (static) | Task touches database queries or async data fetching |
| 9b | Perf Measure | Perf-sensitive task (UI or DB) — bundle/Web Vitals/EXPLAIN vs budget |
| 10 | QA Tester | Always — parallel with the other reviews |
| 11 | Security Audit | Always — parallel |
| 11b | Dep Audit | Always — SCA scan for vulnerable dependencies (parallel) |
| — | Blocker gate | Always — **stops if any review returns blockers** |
| 12 | PR Reviewer | Always — verifies DoD, marks roadmap [x], opens PR |

All of steps 8–11b run **in parallel**; the blocker gate waits for them all.

---

## Invoking the Workflow

When this skill is invoked with `/ship-task <TASK-ID>`, call the Workflow tool immediately with `args` set to the task ID string (e.g. `"10.3"`) and the script below. Do not ask for confirmation — the user invoking `/ship-task` is an explicit opt-in for multi-agent orchestration.

```js
export const meta = {
  name: 'ship-task',
  description: 'Autonomous end-to-end pipeline that ships a roadmap task to a PR',
  phases: [
    { title: 'Validate' },
    { title: 'Setup' },
    { title: 'Schema' },
    { title: 'Implement' },
    { title: 'Document' },
    { title: 'Commit' },
    { title: 'Review' },
    { title: 'Ship' },
  ],
}

const TASK_ID = args
if (!TASK_ID) return { status: 'error', reason: 'No task ID provided. Usage: /ship-task <ID>' }

const TASK_INFO_SCHEMA = {
  type: 'object',
  required: ['taskBlock', 'taskTitle', 'impactSchema', 'touchesUI', 'touchesSchema', 'dorMet', 'dorMissing'],
  properties: {
    taskBlock:     { type: 'string' },
    taskTitle:     { type: 'string' },
    impactSchema:  { type: 'string', enum: ['Migration', 'None', 'To confirm'] },
    touchesUI:     { type: 'boolean' },
    touchesSchema: { type: 'boolean' },
    dorMet:        { type: 'boolean' },
    dorMissing:    { type: 'array', items: { type: 'string' } },
  },
}

const CODER_RESULT_SCHEMA = {
  type: 'object',
  required: ['filesChanged', 'touchesUI', 'touchesSchema'],
  properties: {
    filesChanged:  { type: 'array', items: { type: 'string' } },
    touchesUI:     { type: 'boolean' },
    touchesSchema: { type: 'boolean' },
    summary:       { type: 'string' },
  },
}

const TEST_RED_SCHEMA = {
  type: 'object',
  required: ['testFiles', 'testCount', 'failCount', 'redConfirmed'],
  properties: {
    testFiles:    { type: 'array', items: { type: 'string' } },
    testCount:    { type: 'number' },
    failCount:    { type: 'number' },
    redConfirmed: { type: 'boolean', description: 'true if at least one test fails (expected in RED phase)' },
    warning:      { type: 'string', description: 'set if all tests pass vacuously' },
  },
}

const TEST_GREEN_SCHEMA = {
  type: 'object',
  required: ['testsPassed', 'failures'],
  properties: {
    testsPassed: { type: 'boolean' },
    failures:    { type: 'array', items: { type: 'string' } },
  },
}

const DOCS_RESULT_SCHEMA = {
  type: 'object',
  required: ['docFiles', 'updated'],
  properties: {
    docFiles: { type: 'array', items: { type: 'string' }, description: 'doc files created or modified' },
    updated:  { type: 'boolean', description: 'true if any documentation was changed' },
    summary:  { type: 'string' },
  },
}

const REVIEW_RESULT_SCHEMA = {
  type: 'object',
  required: ['label', 'blockers', 'warnings'],
  properties: {
    label:    { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'Must be fixed before merge' },
    warnings: { type: 'array', items: { type: 'string' }, description: 'Worth fixing, not blocking' },
  },
}

// ── Phase 0: Validate DoR ────────────────────────────────────────────────
phase('Validate')
log('Reading roadmap and validating DoR for task ' + TASK_ID + '…')

const taskInfo = await agent(
  'Read docs/ROADMAP.md. Find the task block for task ID "' + TASK_ID + '" ' +
  '(look for "**' + TASK_ID + ' —" or "**' + TASK_ID + '.**").\n' +
  'Extract and return:\n' +
  '- taskBlock: the full markdown block for this task (from its heading to the next task heading)\n' +
  '- taskTitle: the short title after the em dash\n' +
  '- impactSchema: the value after "Schema impact:" — return exactly "Migration", "None", or "To confirm"\n' +
  '- touchesUI: true if the task description mentions UI, page, form, modal, component, or paths that match the UI source directories defined in .claude/context.md\n' +
  '- touchesSchema: true if the task description mentions schema, database, Supabase, RLS, or migrations\n' +
  '- dorMet: true only if ALL of the following are present in the task block:\n' +
  '  1. A task ID is assigned (the block exists)\n' +
  '  2. Schema impact is NOT "To confirm"\n' +
  '  3. At least 2 acceptance criteria bullet points exist\n' +
  '  4. The task is NOT already marked [x]\n' +
  '  5. The task block contains a non-empty description\n' +
  '- dorMissing: list each unmet DoR criterion as a string (empty array if dorMet is true)',
  { schema: TASK_INFO_SCHEMA, phase: 'Validate' }
)

if (!taskInfo) return { status: 'error', reason: 'Could not read task ' + TASK_ID + ' from roadmap. Does it exist?' }

if (!taskInfo.dorMet) {
  log('🚫 DoR not met for task ' + TASK_ID + ': ' + taskInfo.dorMissing.join(', '))
  return { status: 'blocked', reason: 'Definition of Ready not satisfied', taskId: TASK_ID, missing: taskInfo.dorMissing }
}

log('✅ DoR satisfied — "' + taskInfo.taskTitle + '"')

// ── Phase 1: Setup ───────────────────────────────────────────────────────
phase('Setup')
const branchSlug = TASK_ID.replace(/\./g, '-')
await agent(
  'You are setting up the dev environment for task ' + TASK_ID + '.\n' +
  '1. Write the string "' + TASK_ID + '" (no quotes, no trailing newline) to the file .current-task at the project root.\n' +
  '2. Run: git switch -c feature/task-' + branchSlug + '\n' +
  '   If that branch already exists, run: git switch feature/task-' + branchSlug + '\n' +
  '3. Confirm both steps succeeded.',
  { phase: 'Setup' }
)

// ── Phase 2: Schema migration (conditional) ──────────────────────────────
if (taskInfo.impactSchema === 'Migration') {
  phase('Schema')
  log('Schema migration required — running schema-agent…')
  await agent(
    'Read .claude/skills/schema-agent/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n\n' +
    'Full task block:\n' + taskInfo.taskBlock + '\n\n' +
    'Complete the full schema-agent workflow: design the migration, apply it, update the schema cheatsheet.',
    { phase: 'Schema', agentType: 'schema-agent' }
  )
}

// ── Phase 3: Tests — RED ─────────────────────────────────────────────────
phase('Implement')
log('Running test-writer (RED phase)…')
const redResult = await agent(
  'Read .claude/skills/test-writer/SKILL.md and follow it exactly.\n' +
  'MODE: RED — you are running BEFORE implementation. Write tests from acceptance criteria only.\n' +
  'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n\n' +
  'Full task block:\n' + taskInfo.taskBlock + '\n\n' +
  'Instructions:\n' +
  '1. Do NOT read implementation files — derive tests from acceptance criteria only\n' +
  '2. Write unit tests and E2E specs per the project test conventions in .claude/context.md\n' +
  '3. Run the unit test suite\n' +
  '4. Tests SHOULD fail — the implementation does not exist yet\n' +
  'Report: testFiles (array of paths written), testCount (number), failCount (number), ' +
  'redConfirmed (true if failCount > 0), and a warning string if all tests pass vacuously.',
  { schema: TEST_RED_SCHEMA, phase: 'Implement', label: 'test-writer (RED)', agentType: 'test-writer' }
)

if (!redResult) return { status: 'error', reason: 'Test-writer (RED) agent failed for task ' + TASK_ID }
if (redResult.warning) log('⚠️  ' + redResult.warning)
log('🔴 RED phase: ' + redResult.testCount + ' tests written, ' + redResult.failCount + ' failing (expected)')

// ── Phase 4: Implement ────────────────────────────────────────────────────
log('Running coder…')
const coderResult = await agent(
  'Read .claude/skills/coder/SKILL.md and follow it exactly.\n' +
  'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
  'Tests already written (RED phase): ' + JSON.stringify(redResult.testFiles) + '\n\n' +
  'Full task block:\n' + taskInfo.taskBlock + '\n\n' +
  'Implement the complete task. The test files listed above already exist and are failing — ' +
  'your goal is to make them pass. Do NOT modify the test files.\n' +
  'When done, report: which files you changed (array of paths), ' +
  'whether you touched UI source files (touchesUI bool), ' +
  'whether you touched Supabase queries or migrations (touchesSchema bool), ' +
  'and a one-sentence summary of what was implemented.',
  { schema: CODER_RESULT_SCHEMA, phase: 'Implement', label: 'coder', agentType: 'coder' }
)

if (!coderResult) return { status: 'error', reason: 'Coder agent failed for task ' + TASK_ID }

// ── Phase 5: Tests — GREEN (with /debugger self-repair loop) ──────────────
async function runGreen() {
  return await agent(
    'Read .claude/skills/test-writer/SKILL.md and follow it exactly.\n' +
    'MODE: GREEN — the implementation is now complete. Run the existing tests without modifying them.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
    'Test files to run: ' + JSON.stringify(redResult.testFiles) + '\n\n' +
    'Instructions:\n' +
    '1. Do NOT modify any test file\n' +
    '2. Run the full unit test suite\n' +
    '3. All tests SHOULD pass now\n' +
    'Report: testsPassed (bool), failures (array of failing test names or messages).',
    { schema: TEST_GREEN_SCHEMA, phase: 'Implement', label: 'test-writer (GREEN)', agentType: 'test-writer' }
  )
}

log('Running test-writer (GREEN phase)…')
let greenResult = await runGreen()

// Self-repair: if tests fail, dispatch /debugger to root-cause and fix, then re-run.
// Bounded — after MAX_FIX_ATTEMPTS the pipeline hands back to a human.
const MAX_FIX_ATTEMPTS = 2
let fixAttempts = 0
while ((!greenResult || !greenResult.testsPassed) && fixAttempts < MAX_FIX_ATTEMPTS) {
  fixAttempts++
  const failures = greenResult ? greenResult.failures : ['test-writer agent failed']
  log('🔧 GREEN failing — dispatching /debugger (auto-fix ' + fixAttempts + '/' + MAX_FIX_ATTEMPTS + ')…')
  await agent(
    'Read .claude/skills/debugger/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
    'The implementation is complete but these tests still fail:\n' + JSON.stringify(failures) + '\n\n' +
    'Reproduce, find the ROOT CAUSE, and apply the minimal fix to the IMPLEMENTATION so the failing tests pass. ' +
    'Do NOT modify the test files — they are the contract. Do NOT add features.',
    { phase: 'Implement', label: 'debugger (fix #' + fixAttempts + ')', agentType: 'debugger' }
  )
  greenResult = await runGreen()
}

if (!greenResult || !greenResult.testsPassed) {
  const failures = greenResult ? greenResult.failures : ['agent failed']
  log('🚫 Tests still failing after ' + MAX_FIX_ATTEMPTS + ' auto-fix attempt(s) — needs human review')
  return { status: 'blocked', reason: 'Tests not passing after implementation + ' + MAX_FIX_ATTEMPTS + ' debugger attempts', taskId: TASK_ID, failures: failures }
}
log('✅ GREEN phase: all tests passing' + (fixAttempts > 0 ? ' (after ' + fixAttempts + ' auto-fix)' : ''))

// ── Phase: Documentation (conditional) ───────────────────────────────────
// Update docs when the change touches an interface or user-facing surface.
let docFiles = []
if (taskInfo.touchesSchema || coderResult.touchesSchema || taskInfo.touchesUI || coderResult.touchesUI) {
  phase('Document')
  log('Running docs agent…')
  const docsResult = await agent(
    'Read .claude/skills/docs/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
    'Files changed: ' + JSON.stringify(coderResult.filesChanged) + '\n\n' +
    'Update README, API reference, schema cheatsheet, and CHANGELOG to reflect these changes. ' +
    'Do NOT touch application logic, tests, schema definitions, or docs/ROADMAP.md.\n' +
    'If nothing user-facing or interface-facing changed, make no edits and return updated=false.\n' +
    'Report: docFiles (array of doc paths changed), updated (bool), and a one-sentence summary.',
    { schema: DOCS_RESULT_SCHEMA, phase: 'Document', label: 'docs', agentType: 'docs' }
  )
  if (docsResult && docsResult.updated) {
    docFiles = docsResult.docFiles
    log('📘 Docs updated: ' + docFiles.join(', '))
  } else {
    log('📘 No documentation changes needed')
  }
}

// ── Commit: checkpoint before reviews ────────────────────────────────────
phase('Commit')
log('Committing implementation + tests…')
const allFiles = coderResult.filesChanged.concat(redResult.testFiles).concat(docFiles)
await agent(
  'Create a conventional commit for task ' + TASK_ID + '.\n' +
  'Files to stage: ' + JSON.stringify(allFiles) + '\n\n' +
  'Steps:\n' +
  '1. Run the project lint command (see .claude/context.md for the exact command)\n' +
  '2. Run: git add ' + allFiles.map(function(f) { return '"' + f + '"' }).join(' ') + '\n' +
  '3. Commit using the Conventional Commits format defined in .claude/context.md.\n' +
  'Confirm the commit SHA.',
  { phase: 'Commit', agentType: 'commit' }
)
log('✅ Implementation committed — reviews can now run safely')

// ── Parallel reviews ──────────────────────────────────────────────────────
phase('Review')
const needsUX   = taskInfo.touchesUI   || coderResult.touchesUI
const needsPerf = taskInfo.touchesSchema || coderResult.touchesSchema
const reviewTasks = []

if (needsUX) {
  reviewTasks.push(function() {
    return agent(
      'Read .claude/skills/ux-review/SKILL.md and follow it exactly.\n' +
      'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
      'Files changed: ' + JSON.stringify(coderResult.filesChanged) + '\n' +
      'Run the full 7-dimension UX review.\n' +
      'Return label="ux-review", blockers (array of must-fix issues), warnings (array of nice-to-fix issues).',
      { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'ux-review', agentType: 'ux-review' }
    )
  })
}

if (needsPerf) {
  reviewTasks.push(function() {
    return agent(
      'Read .claude/skills/perf-review/SKILL.md and follow it exactly.\n' +
      'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
      'Files changed: ' + JSON.stringify(coderResult.filesChanged) + '\n' +
      'Run the full performance review: N+1 queries, unbounded queries, missing pagination, over-fetching, async patterns.\n' +
      'Return label="perf-review", blockers (array of must-fix issues), warnings (array of nice-to-fix issues).',
      { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'perf-review', agentType: 'perf-review' }
    )
  })
}

reviewTasks.push(function() {
  return agent(
    'Read .claude/skills/qa-tester/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n\n' +
    'Full task block:\n' + taskInfo.taskBlock + '\n\n' +
    'Run the full UAT checklist and visual screenshot review.\n' +
    'Return label="qa-tester", blockers (array of must-fix issues), warnings (array of nice-to-fix issues).',
    { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'qa-tester', agentType: 'qa-tester' }
  )
})

reviewTasks.push(function() {
  return agent(
    'Read .claude/skills/security-audit/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
    'Files changed: ' + JSON.stringify(coderResult.filesChanged) + '\n' +
    'Run the full OWASP Top 10 + project absolute rules security audit.\n' +
    'Return label="security-audit", blockers (array of must-fix violations), warnings (array of nice-to-fix issues).',
    { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'security-audit', agentType: 'security-audit' }
  )
})

// Dependency/SCA scan — always (OWASP A06; code review cannot catch vulnerable libraries).
reviewTasks.push(function() {
  return agent(
    'Read .claude/skills/dep-audit/SKILL.md and follow it exactly.\n' +
    'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
    'Run the dependency/SCA audit using the audit command from .claude/context.md. ' +
    'Treat Critical/High vulnerabilities that have a non-major fix available as blockers; ' +
    'major-bump-only fixes and outdated (non-security) packages are warnings. ' +
    'Do NOT apply major version bumps. If no audit command is configured, return no blockers and one warning saying so.\n' +
    'Return label="dep-audit", blockers (array), warnings (array).',
    { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'dep-audit', agentType: 'dep-audit' }
  )
})

// Measured performance — only when the task is perf-sensitive (UI bundle/Web Vitals, or DB queries).
if (needsPerf || needsUX) {
  reviewTasks.push(function() {
    return agent(
      'Read .claude/skills/perf-measure/SKILL.md and follow it exactly.\n' +
      'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n' +
      'Files changed: ' + JSON.stringify(coderResult.filesChanged) + '\n' +
      'Measure against the budgets in .claude/context.md: bundle size, Core Web Vitals on affected routes, ' +
      'and query EXPLAIN on hot paths. Treat a budget breach as a blocker; near-budget as a warning. ' +
      'If the app cannot be built or run in this environment, return no blockers and one warning explaining why ' +
      '(so a transient/headless limitation never falsely blocks the PR).\n' +
      'Return label="perf-measure", blockers (array), warnings (array).',
      { schema: REVIEW_RESULT_SCHEMA, phase: 'Review', label: 'perf-measure', agentType: 'perf-measure' }
    )
  })
}

const reviewResults = await parallel(reviewTasks)
const succeeded = reviewResults.filter(Boolean)
log('Reviews complete — ' + succeeded.length + '/' + reviewTasks.length + ' agents returned results')

const allBlockers = succeeded.flatMap(function(r) { return r.blockers })
const allWarnings = succeeded.flatMap(function(r) { return r.warnings })

if (allWarnings.length > 0) log('⚠️  Warnings: ' + allWarnings.join(' | '))

if (allBlockers.length > 0) {
  log('🚫 ' + allBlockers.length + ' blocker(s) found — pipeline stopped before PR')
  return {
    status: 'blocked',
    reason: 'Review blockers must be resolved before opening a PR',
    taskId: TASK_ID,
    blockers: allBlockers,
    warnings: allWarnings,
  }
}
log('✅ No blockers — proceeding to Ship')

// ── Phase 9: Ship ────────────────────────────────────────────────────────
phase('Ship')
await agent(
  'Read .claude/skills/pr-reviewer/SKILL.md and follow it exactly.\n' +
  'Active task: ' + TASK_ID + ' — ' + taskInfo.taskTitle + '\n\n' +
  'Full task block:\n' + taskInfo.taskBlock + '\n\n' +
  'Verify all DoD criteria are met. Mark the task [x] in docs/ROADMAP.md (update sprint table and global status). ' +
  'Run lint and tests. Open a PR to the integration branch with a clear summary. Return the PR URL.',
  { phase: 'Ship', agentType: 'pr-reviewer' }
)

log('🎉 Task ' + TASK_ID + ' — automated pipeline complete, PR opened. Human UAT + merge are yours.')
return { status: 'done', taskId: TASK_ID, awaiting: 'human UAT + merge on the PR' }
```

---

## Human touchpoints

The pipeline returns control to you only when:

| Situation | What to do |
|-----------|------------|
| DoR not met | Fix the missing fields in `docs/ROADMAP.md` via `/planner`, then re-run `/ship-task <ID>` |
| Tests still failing after auto-fix | `/debugger` already tried twice and couldn't make them pass — review the failures, fix manually, then re-run |
| Review blockers | A review (UX/perf/QA/security/dep/perf-measure) found a must-fix issue — resolve it, then re-run |
| PR URL returned | Run **human UAT** against the PR — tick the UAT checklist in the PR body, then merge |

All other steps — branch creation, schema migration, implementation, doc updates, the debugger self-repair loop, and all six parallel reviews — run without prompting.

---

## Cross-references

- Task not in roadmap yet: `/planner`
- Check roadmap progress: `/roadmap-status`
- Audit a branch manually: `/pr-reviewer` (audit mode)
- Run the pipeline step-by-step: see project CLAUDE.md pipeline table
