#!/usr/bin/env bash
# remind-docs-generate.sh — remind to run docs:generate after schema or API changes.
#
# Wired as PostToolUse(Edit) and PostToolUse(Write) in settings.json.
# Triggers when prisma/schema.prisma or any file under src/app/api/ is written,
# since those are the two sources that feed the *.generated.md doc files.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

# Strip the project root prefix to get a repo-relative path for matching.
project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -n "$project_dir" ]; then
  rel_path="${file_path#${project_dir}/}"
else
  rel_path="$file_path"
fi

# Doc-source paths and regenerate command come from the stack profile.
if printf '%s' "$rel_path" | grep -Eq "${STACK_DOCS_SOURCE_REGEX:-^(prisma/schema\.prisma$|src/app/api/)}"; then
  printf '⚠️  CONTRIBUTING reminder: "%s" was changed — run `%s` to regenerate the generated docs before opening a PR.\n' "$rel_path" "${STACK_DOCS_GENERATE_CMD:-npm run docs:generate}"
fi

exit 0
