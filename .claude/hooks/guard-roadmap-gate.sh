#!/bin/bash
# Block editing implementation files without an active roadmap task declared via /start-task
# Exempt: docs/ROADMAP.md, CLAUDE.md, .claude/ (tooling), root config files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

# Strip the project root prefix to normalise the path
RELATIVE=$(echo "$FILE_PATH" | sed "s|^${CLAUDE_PROJECT_DIR:-$(pwd)}/||")

# Only gate implementation files — gated paths come from the stack profile.
if ! echo "$RELATIVE" | grep -qE "${STACK_GATED_PATHS_REGEX:-^(src/|tests/|prisma/schema\.prisma)}"; then
  exit 0
fi

CURRENT_TASK_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.current-task"

if [ ! -f "$CURRENT_TASK_FILE" ]; then
  echo '{"continue": false, "stopReason": "🚫 ROADMAP GATE: No active task declared. Run /start-task <TASK-ID> before editing src/, tests/, or schema files. The task must exist in docs/ROADMAP.md and satisfy the Definition of Ready."}'
  exit 0
fi

TASK_ID=$(head -1 "$CURRENT_TASK_FILE" | tr -d '[:space:]')

if [ -z "$TASK_ID" ]; then
  echo '{"continue": false, "stopReason": "🚫 ROADMAP GATE: .current-task is empty. Run /start-task <TASK-ID> to set the active task."}'
  exit 0
fi

ROADMAP="${CLAUDE_PROJECT_DIR:-$(pwd)}/docs/ROADMAP.md"

if ! grep -qF "$TASK_ID" "$ROADMAP"; then
  echo "{\"continue\": false, \"stopReason\": \"🚫 ROADMAP GATE: Task '${TASK_ID}' (from .current-task) not found in docs/ROADMAP.md. Add it using the template first, then re-run /start-task ${TASK_ID}.\"}"
  exit 0
fi
