#!/usr/bin/env bash
# guard-commit-message.sh — enforce Conventional Commits format on git commit -m (R contribution).
#
# Wired as PreToolUse(Bash) in settings.json.
# Checks that the commit subject matches: type(scope): description
# Types: feat, fix, docs, refactor, test, chore, ci, perf, style, build, revert
#
# Only inspects -m "..." / -m '...' patterns. Heredoc commits (git commit -m "$(cat ...)")
# are skipped gracefully — they can't be parsed reliably.

set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Fast path: only check git commit commands that use -m
case "$cmd" in
  *git*commit*-m*) ;;
  *) exit 0 ;;
esac

# Extract the first argument after -m (handles both " and ' quoting)
msg=$(printf '%s' "$cmd" | grep -oP "(?<=-m\s)['\"].*?['\"]" | head -1 | sed "s/^['\"]//;s/['\"]$//")

# If we couldn't parse the message (heredoc, variable, etc.), allow through
[ -z "$msg" ] && exit 0

# Extract first line (subject) only
subject=$(printf '%s' "$msg" | head -1)

TYPES="feat|fix|docs|refactor|test|chore|ci|perf|style|build|revert"
if ! printf '%s' "$subject" | grep -Eq "^($TYPES)(\(.+\))?: .{1,}"; then
  printf '⚠️  CONVENTIONAL COMMITS : "%s" ne respecte pas le format.\n' "$subject"
  printf 'Format attendu : type(scope): description courte en français\n'
  printf 'Exemples : feat(analyses): ajoute le filtre par matrice\n'
  printf '           fix(lots): corrige le blocage sur NC produit\n'
  printf '           chore(deps): met à jour prisma-erd-generator\n'
  printf 'Types valides : feat, fix, docs, refactor, test, chore, ci, perf, style, build, revert\n'
fi

exit 0
