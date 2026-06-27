# /locate — Change-Set Scout

## Core Purpose

`/locate` is a read-only scouting step that answers: "What files and line ranges must change, and in what order?" It precedes expensive editing work by a large language model, minimizing wasted token budgets on re-discovery.

## Key Responsibilities

The scout:
- Reads excerpts and traces call paths through them
- Returns file paths, line ranges, and dependency edges
- Identifies the minimal set of targets to edit
- Flags ripples (shared types, public signatures, affected tests)
- **Never edits, creates, or runs builds**

## Workflow

1. **Anchor on architecture**: Consult `docs/ARCHITECTURE.md` code map first if available
2. **Find entry point**: Locate where behavior is triggered (route, handler, command)
3. **Trace inward**: Follow the shortest path to the actual change point
4. **Scope targets**: Separate files to edit from context-only reads
5. **Return a map**: Structured change-set with targets, call path, ripples, and edit order

## Output Format

The scout returns a compact plan listing:
- Target files with line ranges and justifications
- Call path (entry → change point, with file:line hops)
- Context-only reads (for the builder's reference)
- Edit sequence and ripple warnings

This disciplined handoff ensures the builder (`/coder`, `/debugger`) works only on identified change points rather than exploring the entire codebase.
