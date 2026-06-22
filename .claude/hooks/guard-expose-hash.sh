#!/usr/bin/env bash
# guard-expose-hash.sh — warn when sensitive fields may be exposed in an API response.
#
# Wired as PostToolUse(Edit) and PostToolUse(Write) in settings.json.
# Scans written content for patterns that could leak sensitive data.
#
# EXAMPLE: adapt to your project's sensitive field names (password hash, tokens, secrets).
# Replace the grep pattern below with the field names that must never appear in an
# API response body — e.g. `passwordHash`, `hashedPassword`, `apiSecret`,
# `refreshToken`, `privateKey`, etc. Add one grep per sensitive field family,
# or combine them into a single alternation pattern.
#
# Test files (*.test.ts, *.spec.ts) are excluded.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

if printf '%s' "$file_path" | grep -Eq "${STACK_TEST_FILE_REGEX:-\.(test|spec)\.(ts|tsx|js|jsx)$}"; then
  exit 0
fi

content=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')

# Sensitive field names come from the stack profile. The surrounding regex catches a
# field selected as `true` (ORM select block) or included in a returned object.
FIELDS="${STACK_SENSITIVE_FIELDS:-passwordHash|hashedPassword|apiSecret|refreshToken|privateKey}"
if printf '%s' "$content" | grep -Eq "($FIELDS)\s*:\s*true|($FIELDS)[^:=]*(,|\})"; then
  printf '⚠️  SENSITIVE FIELD EXPOSURE: a sensitive field (password hash, token, or secret) was detected in "%s". Never include these fields in API responses — exclude them explicitly with `select` or delete them from the result object before returning.\n' "$file_path"
fi

exit 0
