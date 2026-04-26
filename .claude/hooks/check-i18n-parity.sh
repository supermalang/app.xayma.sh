#!/usr/bin/env bash
# PostToolUse: checks that en.ts and fr.ts have the same top-level keys
# Only fires when either translation file is edited

FILE_PATH="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

# Only run when a translation file was touched
if [[ "$FILE_PATH" != *"/i18n/en.ts" && "$FILE_PATH" != *"/i18n/fr.ts" ]]; then
  exit 0
fi

EN_FILE="src/i18n/en.ts"
FR_FILE="src/i18n/fr.ts"

if [ ! -f "$EN_FILE" ] || [ ! -f "$FR_FILE" ]; then
  exit 0
fi

# Extract top-level keys from both files and compare
EN_KEYS=$(grep -oP '^\s+\K\w+(?=:)' "$EN_FILE" | sort)
FR_KEYS=$(grep -oP '^\s+\K\w+(?=:)' "$FR_FILE" | sort)

DIFF=$(diff <(echo "$EN_KEYS") <(echo "$FR_KEYS"))

if [ -n "$DIFF" ]; then
  echo "i18n parity failure — en.ts and fr.ts have mismatched keys:" >&2
  echo "$DIFF" >&2
  echo "Add the missing keys to both files before proceeding." >&2
  exit 2
fi

exit 0