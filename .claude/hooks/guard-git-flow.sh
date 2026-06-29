#!/usr/bin/env bash
# guard-git-flow.sh — enforce the feature-branch → PR → develop → main workflow.
#
# Wired as a PreToolUse(Bash) hook in .claude/settings.json. Reads the hook
# JSON on stdin and, for git commands only, emits a "deny" permission decision
# when the action would land directly on a protected branch:
#   - committing while HEAD is on `main` or `develop`
#   - pushing `main` or `develop` (explicit ref, or a bare `git push` while sitting on them)
#
# Workflow (see CLAUDE.md — Branches):
#   feature branch → PR → develop  (integration branch)
#   develop → PR → main            (production release)
#
# Exit 0 with no output = allow (the harness falls back to normal permissions).

set -uo pipefail

# Space-separated list of protected branches.
PROTECTED_LIST="main develop"

is_protected() {
  local b="$1"
  for p in $PROTECTED_LIST; do
    [ "$b" = "$p" ] && return 0
  done
  return 1
}

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Fast path: ignore anything that isn't a git command.
case "$cmd" in
  *git*) ;;
  *) exit 0 ;;
esac

deny () {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# --- Block commits made while on a protected branch -------------------------
if printf '%s' "$cmd" | grep -Eq 'git( +-[^ ]+)* +commit\b'; then
  if is_protected "$branch"; then
    deny "Refus de committer sur '$branch' (branche protégée). Workflow : crée une branche de feature depuis develop — git switch develop && git switch -c <type>/<description> — puis committe et ouvre une PR vers develop. (Blocked: committing directly on '$branch'. Branch from develop and open a PR targeting develop instead.)"
  fi

  # --- Warn on non-conventional branch name ----------------------------------
  case "$branch" in
    main|master|develop|feature/*|fix/*|chore/*|hotfix/*|release/*|refactor/*|test/*|docs/*|ci/*)
      ;;  # valid branch name
    "")
      ;;  # detached HEAD, skip
    *)
      printf '⚠️  BRANCH NAME : la branche "%s" ne suit pas la convention de nommage.\nConvention : feature/<description>, fix/<description>, chore/<description>, hotfix/<description>.\nCréer la branche correcte : git switch -c feature/<courte-description>\n' "$branch"
      ;;
  esac
fi

# --- Block pushing a protected branch ---------------------------------------
if printf '%s' "$cmd" | grep -Eq 'git( +-[^ ]+)* +push\b'; then
  # Explicit ref to a protected branch: `git push origin main`, `HEAD:develop`, `+main`, etc.
  for p in $PROTECTED_LIST; do
    if printf '%s' "$cmd" | grep -Eq "(^|[[:space:]:+])${p}([[:space:]]|\$)"; then
      deny "Refus de pousser vers '$p'. Pousse ta branche feature et ouvre une PR vers develop : git push -u origin <branche> puis gh pr create --base develop. (Blocked: pushing to '$p'. Push your feature branch and open a PR targeting develop.)"
    fi
  done
  # Bare `git push` while sitting on a protected branch.
  if is_protected "$branch"; then
    deny "Tu es sur '$branch' (branche protégée) — un 'git push' nu est bloqué. Branche depuis develop, committe, et ouvre une PR. (Blocked: bare push from '$branch'. Branch from develop and open a PR instead.)"
  fi
fi

exit 0
