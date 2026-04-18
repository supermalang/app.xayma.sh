# /status — Sprint Progress Report

## Usage
```
/status
```

## Purpose
Get current sprint progress, timeline, and blockers from `IMPLEMENTATION_PLAN.md`.

## Output Format

```markdown
# Sprint 3 Status Report
**Generated**: [Timestamp]
**Current Date**: March 26, 2026

## Sprint Overview
- **Theme**: Services & Deployments
- **Duration**: 2 weeks (Weeks 5–6)
- **Progress**: 65% (13/20 tasks)
- **Status**: ON TRACK

## Completed Tasks (13/20)
- [x] 3.1 Build DeploymentService — 2 days ✅
- [x] 3.2 Create DeploymentWizard component — 3 days ✅
- [x] 3.3 Implement deployment.store — 2 days ✅
- [x] 3.4 Build Services list page — 2 days ✅
- [x] 3.5 Build Deployment detail page — 2 days ✅
- ...

## In Progress (1/20)
- [ ] 3.14 Deployment status badges (1 day remaining, started 3/25)

## Pending (6/20)
- [ ] 3.15 Docker image tagging workflow (Est. 1.5 days)
- [ ] 3.16 Restore service snapshots (Est. 2 days)
- [ ] 3.17–3.20 Sprint tests and verification

## Timeline Analysis
- **Sprint deadline**: March 31, 2026 (5 days remaining)
- **Critical path**: Task 3.15 → 3.16 (3.5 days)
- **Parallel work**: 3.17–3.20 can run after 3.14
- **Buffer**: 1.5 days
- **Assessment**: ON TRACK (ample buffer)

## Blockers
None currently

## Risks
- None identified

## Metrics
- **Velocity**: 13 tasks/10 days = 1.3 tasks/day
- **Test coverage**: 82% average (target: 80%)
- **Code quality**: 0 ESLint warnings, 0 TypeScript errors
- **E2E pass rate**: 100%

## Next Steps (Priority Order)
1. Complete 3.14 (1 day) — finish current work
2. Start 3.15–3.16 in parallel (3.5 days) — critical path
3. Execute 3.17–3.20 tests (2 days) — final validation
4. Run `/test-sprint` E2E gate (1 day) — sprint approval

## Recommendations
- Continue at current pace; no acceleration needed
- Monitor task 3.15 for docker image complexity
- Plan retrospective for Wednesday (3/31) before sprint close

---
**Last Updated**: March 26, 2026, 10:30 AM
**Prepared by**: Lead Agent
```

## Information Sources
- `IMPLEMENTATION_PLAN.md` — Task definitions, estimates, dependencies
- Git log — Commit timestamps to verify actual progress
- Test results — Coverage, E2E pass rates
- CLAUDE.md — Architecture constraints affecting timeline

## What This Report Includes
- Current sprint number and theme
- Percentage complete with task count
- List of completed tasks (checked off in plan)
- List of in-progress tasks with ETA
- List of pending tasks with estimates
- Critical path analysis (longest dependency chain)
- Slack/buffer remaining
- Blockers and risks
- Velocity metrics
- Recommended next actions

## When to Use This
- **Daily standup**: Quick status check
- **Sprint review**: Detailed progress assessment
- **Escalation**: Identify blockers early
- **Planning**: Understand runway for next sprint

## Related Commands
- `/plan [N]` — Detailed plan for sprint N
- `/test-sprint` — Final E2E gate at sprint end
- `npm run test:coverage` — Real-time coverage data
