#!/usr/bin/env bash
# guard-destructive-db.sh — deny commands that irreversibly wipe the database.
#
# Wired as PreToolUse(Bash) in settings.json. Blocks:
#   - npm run db:reset          (prisma migrate reset — drop + re-migrate + re-seed)
#   - prisma migrate reset      (same, called directly)
#   - docker ... down ... -v / --volumes  (removes the PostgreSQL data volume)
#   - docker volume rm          (removes volumes directly)
#
# These are all near-zero reversibility — require explicit human confirmation,
# not something an automated session should run silently.

set -uo pipefail

# Stack-specific patterns live in stack-profile.sh (override there, not here).
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# Destructive DB reset command — pattern comes from the stack profile.
if printf '%s' "$cmd" | grep -Eq "${STACK_DESTRUCTIVE_DB_PATTERN:-npm run db:reset|prisma migrate reset}"; then
  deny "Commande destructive bloquée : '$cmd' détruit toute la base de données (drop + re-migrate + re-seed). Lance cette commande manuellement si c'est intentionnel. (Destructive: drops and recreates the entire database — run manually if intentional.)"
fi

# docker down -v / --volumes — removes named volumes including the DB data volume
if printf '%s' "$cmd" | grep -q 'docker' \
   && printf '%s' "$cmd" | grep -q 'down' \
   && printf '%s' "$cmd" | grep -Eq '(^| )-v( |$)|--volumes'; then
  deny "Commande destructive bloquée : 'down -v / --volumes' supprime les volumes Docker dont le volume PostgreSQL — toutes les données seront perdues. Lance manuellement si intentionnel. (Destructive: removes Docker volumes including the PostgreSQL data — run manually if intentional.)"
fi

# docker volume rm — removes volumes directly
if printf '%s' "$cmd" | grep -Eq 'docker volume rm'; then
  deny "Commande destructive bloquée : 'docker volume rm' peut supprimer le volume PostgreSQL. Lance manuellement si intentionnel. (Destructive: may remove the PostgreSQL data volume — run manually if intentional.)"
fi

exit 0
