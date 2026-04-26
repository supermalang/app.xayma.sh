#!/usr/bin/env bash
# PreToolUse: scans content being written to src/ for direct n8n URL usage
# All n8n calls must go through src/services/workflow-engine.ts

FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
CONTENT="${CLAUDE_TOOL_INPUT_CONTENT:-}"

# Only check files in src/ but not the workflow-engine service itself
if [[ "$FILE_PATH" != src/* ]] || [[ "$FILE_PATH" == *"workflow-engine.ts" ]]; then
  exit 0
fi

# Check for direct n8n/workflow-engine URL patterns in the content being written
if echo "$CONTENT" | grep -qE "fetch\(['\"]https?://[^'\"]*webhook|VITE_WORKFLOW_ENGINE_BASE_URL[^}]*fetch"; then
  echo "BLOCKED: Direct n8n/webhook URL call detected in $FILE_PATH." >&2
  echo "All workflow engine calls must go through src/services/workflow-engine.ts." >&2
  exit 2
fi

exit 0