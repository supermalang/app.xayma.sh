#!/usr/bin/env bash
# guard-credit-write.sh — warn on direct credit mutations bypassing Kafka/workflow-engine.
# Xayma architecture rule 6: never update partners.remainingCredits from frontend/services;
# all credit events flow Vue → n8n webhook → Kafka → consumer → Supabase.
# PostToolUse(Edit|Write). Warning only — review is the backstop. Test files excluded.

set -uo pipefail
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
if printf '%s' "$file_path" | grep -Eq "${STACK_TEST_FILE_REGEX:-\.(test|spec)\.(ts|tsx|js)$}"; then exit 0; fi

content=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')
if printf '%s' "$content" | grep -Eq "${STACK_CREDIT_WRITE_PATTERN:-remainingCredits[[:space:]]*[:=]}"; then
  printf '⚠️  CREDIT RULE (architecture rule 6): direct credit mutation detected in "%s". Never update partners.remainingCredits from Vue/services — fire a workflow-engine webhook so the change flows through Kafka.\n' "$file_path"
fi
exit 0
