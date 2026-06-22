#!/usr/bin/env bash
# guard-secret-scan.sh — warn when a hardcoded secret may have been written.
#
# Wired as PostToolUse(Edit) and PostToolUse(Write) in settings.json.
# Broader than guard-expose-hash (which only catches sensitive fields in API
# responses) — this scans any written content for credentials that should never
# be committed: private keys, cloud keys, provider tokens, and generic
# secret/api-key/password assignments to a literal value.
#
# Patterns are overridable via STACK_SECRET_PATTERNS in stack-profile.sh; the
# defaults below are stack-agnostic. Warning only (not a hard block) to match
# the other rule hooks — review and CI are the backstop. Test files are excluded.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

# Skip test/spec files and example env files (placeholders live there).
if printf '%s' "$file_path" | grep -Eq "${STACK_TEST_FILE_REGEX:-\.(test|spec)\.(ts|tsx|js|jsx)$}"; then
  exit 0
fi
case "$file_path" in
  *.env.example | *.env.sample | *.env.template) exit 0 ;;
esac

content=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')

# Default secret patterns (stack-agnostic). Override with STACK_SECRET_PATTERNS.
# q = an optional surrounding quote (single or double).
q="[\"']?"
default_patterns="-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|xox[baprs]-[0-9A-Za-z-]{10,}|AIza[0-9A-Za-z_-]{35}|(api[_-]?key|secret|token|password|passwd|client[_-]?secret|access[_-]?key)[[:space:]]*[:=][[:space:]]*${q}[A-Za-z0-9/+_.-]{12,}"
secret_patterns="${STACK_SECRET_PATTERNS:-$default_patterns}"

# -e guards against the pattern's leading "----" being read as grep options.
if printf '%s' "$content" | grep -Eiq -e "$secret_patterns"; then
  printf '⚠️  SECRET SCAN: a possible hardcoded secret (private key, cloud key, provider token, or credential assignment) was detected in "%s". Never commit secrets — move it to an environment variable and reference it via config. If this is a false positive (placeholder/example), you can ignore this warning.\n' "$file_path"
fi

exit 0
