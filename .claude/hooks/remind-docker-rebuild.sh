#!/usr/bin/env bash
# remind-docker-rebuild.sh — remind to rebuild the Docker app image after a migration.
#
# Wired as PostToolUse(Write) in settings.json.
# Triggers when a new file is written under prisma/migrations/.
#
# The Prisma client is frozen in the Docker image at build time (npx prisma generate
# runs in the Dockerfile). After any migration, the app container must be rebuilt or
# it will crash with "The column ... does not exist" in Server Components.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -n "$project_dir" ]; then
  rel_path="${file_path#${project_dir}/}"
else
  rel_path="$file_path"
fi

# Migrations path and rebuild command come from the stack profile.
if printf '%s' "$rel_path" | grep -Eq "${STACK_MIGRATIONS_REGEX:-^prisma/migrations/}"; then
  printf '⚠️  New migration file: "%s" — if the ORM client is frozen in the Docker image, rebuild the app container after applying the migration: `%s` — otherwise the running app crashes with a "column does not exist" error.\n' "$rel_path" "${STACK_DOCKER_REBUILD_CMD:-docker compose up -d --build app}"
fi

exit 0
