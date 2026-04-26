#!/usr/bin/env bash
# PostToolUse: runs after Write|Edit|MultiEdit on any file
# Only triggers on .ts and .vue files — skip others silently

FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.vue ]]; then
  exit 0
fi

# Run ESLint on the changed file
npx eslint --max-warnings 0 "$FILE_PATH" 2>&1
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  echo "ESLint failed on $FILE_PATH. Fix lint errors before proceeding." >&2
  exit 2
fi

# Run TypeScript type-check (no emit) — project-wide since TS resolves references
npx tsc --noEmit 2>&1
TSC_EXIT=$?

if [ $TSC_EXIT -ne 0 ]; then
  echo "TypeScript type-check failed. Fix type errors before proceeding." >&2
  exit 2
fi

exit 0