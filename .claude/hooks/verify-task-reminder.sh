#!/usr/bin/env bash
# Stop hook: fires when Claude finishes a response
# Injects a reminder to run /verify-task if it hasn't been mentioned
# Uses exit 0 always — this is advisory, not blocking

TRANSCRIPT="${CLAUDE_TRANSCRIPT:-}"

# Only remind if Claude appears to have made code changes
# (heuristic: if PostToolUse fired with Write/Edit during this turn)
# We check for the presence of task-completion language
if echo "$TRANSCRIPT" | grep -qiE "(done|complete|finished|implemented|added|fixed|updated)"; then
  if ! echo "$TRANSCRIPT" | grep -qiE "verify.task|/verify-task"; then
    echo '{"additionalContext": "Reminder: run /verify-task before marking this task complete. Evidence before ✅."}' 
  fi
fi

exit 0