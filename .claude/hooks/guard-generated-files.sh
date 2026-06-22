#!/usr/bin/env bash
# guard-generated-files.sh — block manual edits to auto-generated doc files.
#
# Wired as PreToolUse(Edit) and PreToolUse(Write) in settings.json.
# *.generated.md files are produced by `npm run docs:generate` (from the Prisma
# schema and API routes). Hand-editing them would be silently overwritten on
# the next generate run, creating conflicting diffs or data loss.
#
# To update them: edit the source (schema.prisma or the API route), then run
# `npm run docs:generate`.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

case "$file_path" in
  ${STACK_GENERATED_FILES_GLOB:-*.generated.md})
    jq -n --arg f "$file_path" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Fichier auto-généré — ne pas modifier à la main : " + $f + ". Modifie la source (schema.prisma ou la route API) puis relance `npm run docs:generate`. (Auto-generated — edit the source and regenerate.)")
      }
    }'
    exit 0
    ;;
esac

exit 0
