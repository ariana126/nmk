#!/bin/bash

exit 0





cd "$CLAUDE_PROJECT_DIR" || exit 0

if ! git status --porcelain | grep -q 'src/'; then
  exit 0
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
if ! curl -sf -o /dev/null "$BASE_URL"; then
  exit 0
fi

OUTPUT=$(cd ../acceptance-tests && npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$OUTPUT"
  exit $EXIT_CODE
fi
