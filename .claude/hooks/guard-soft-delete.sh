#!/usr/bin/env bash
# guard-soft-delete.sh — warn when a hard delete is written (soft-delete rule violation).
#
# Wired as PostToolUse(Edit) and PostToolUse(Write) in settings.json.
# Scans the new content for hard-delete patterns and warns immediately,
# before the change is committed or reviewed.
#
# EXAMPLE: adapt this pattern to your ORM's delete method. Checks for hard deletes
# when your project uses soft deletes (i.e. a deletedAt/isDeleted field rather than
# physically removing rows). Replace the grep pattern below with whatever your ORM
# or SQL dialect uses — e.g. `Model.destroy(`, `.remove(`, `DELETE FROM`, etc.
#
# Test files (*.test.ts, *.spec.ts) are excluded — delete calls may appear there
# as part of a mock or cleanup helper, not as a production code path.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

# Skip test and spec files
if printf '%s' "$file_path" | grep -Eq "${STACK_TEST_FILE_REGEX:-\.(test|spec)\.(ts|tsx|js|jsx)$}"; then
  exit 0
fi

# Get written content — 'new_string' for Edit, 'content' for Write
content=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')

# Hard-delete pattern comes from the stack profile (Prisma default below).
if printf '%s' "$content" | grep -Eq "${STACK_SOFT_DELETE_PATTERN:-prisma\.[a-zA-Z]+\.delete\(}"; then
  printf '⚠️  SOFT DELETE RULE: hard delete detected in "%s". Use soft delete instead (e.g. set deletedAt = new Date() / isDeleted = true). Hard deletes break audit trails and are forbidden in projects that enforce data retention.\n' "$file_path"
fi

exit 0
