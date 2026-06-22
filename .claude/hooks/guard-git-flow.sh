#!/usr/bin/env bash
# guard-git-flow.sh — enforce the branch → PR → develop → release workflow.
#
# Wired as a PreToolUse(Bash) hook in .claude/settings.json. Reads the hook
# JSON on stdin and, for git commands only, emits a "deny" permission decision
# when the action would land directly on the protected branch:
#   - committing while HEAD is on `main`
#   - pushing `main` (explicit ref, or a bare `git push` while sitting on main)
#
# Workflow (see CLAUDE.md — Branches):
#   feature branch → PR/MR → develop  (daily integration)
#   develop → release PR → main        (production deployments only)
#
# Exit 0 with no output = allow (the harness falls back to normal permissions).

set -uo pipefail

PROTECTED="main"

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

# --- Block commits made while on the protected branch -----------------------
if printf '%s' "$cmd" | grep -Eq 'git( +-[^ ]+)* +commit\b'; then
  if [ "$branch" = "$PROTECTED" ]; then
    deny "Refus de committer sur '$PROTECTED' (branche de production). Workflow : crée une branche de feature depuis main — git switch main && git switch -c <type>/<description> — puis committe et ouvre une PR vers main. (Blocked: committing directly on '$PROTECTED'. Branch from main and open a PR targeting main instead.)"
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

# --- Block pushing the protected branch -------------------------------------
if printf '%s' "$cmd" | grep -Eq 'git( +-[^ ]+)* +push\b'; then
  # Explicit ref to main: `git push origin main`, `HEAD:main`, `+main`, etc.
  if printf '%s' "$cmd" | grep -Eq '(^|[[:space:]:+])main([[:space:]]|$)'; then
    deny "Refus de pousser vers '$PROTECTED'. Pousse ta branche feature et ouvre une PR vers main : git push -u origin <branche> puis gh pr create --base main. (Blocked: pushing to '$PROTECTED'. Push your feature branch and open a PR targeting main.)"
  fi
  # Bare `git push` while sitting on main (tracking branch is main).
  if [ "$branch" = "$PROTECTED" ]; then
    deny "Tu es sur '$PROTECTED' — un 'git push' nu mettrait à jour la production. Branche, committe, et ouvre une PR vers main. (Blocked: bare push from '$PROTECTED' would update production. Branch and open a PR targeting main.)"
  fi
fi

exit 0
