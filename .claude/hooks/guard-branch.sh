#!/bin/bash
# Block editing implementation files directly on the protected branch (main).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Stack-specific gated paths live in stack-profile.sh.
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

RELATIVE=$(echo "$FILE_PATH" | sed "s|^${CLAUDE_PROJECT_DIR:-$(pwd)}/||")
if echo "$RELATIVE" | grep -qE "${STACK_GATED_PATHS_REGEX:-^(src/|tests/|supabase/migrations/)}"; then
  BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$BRANCH" = "main" ]; then
    echo "{\"continue\": false, \"stopReason\": \"🚫 BRANCH GATE: You are on 'main'. Create a feature branch first: git switch -c <type>/description — then open a PR to main when done.\"}"
  fi
fi
