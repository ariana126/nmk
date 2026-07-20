#!/usr/bin/env bash
#
# PostToolUse counterpart for the .env / .env.example pair. Editing an example file leaves the
# live .env untouched, and nothing in the build notices.
#
# `make setup` alone is not enough: every setup target is `[ -f .env ] || cp .env.example .env`,
# so it is a no-op whenever the .env already exists — the common case. It runs here to cover the
# "not created yet" case, and the key-drift check below covers the rest.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

path="$(jq -r '.tool_input.file_path // empty')"
[ -n "$path" ] || exit 0

case "$path" in
  *.env.example|*.env.test.example) ;;
  *) exit 0 ;;
esac

make -C "$root" setup >/dev/null 2>&1 || true

live="${path%.example}"
[ -f "$live" ] || exit 0

keys() { grep -oE '^[A-Z_][A-Z0-9_]*=' "$1" 2>/dev/null | tr -d '=' | sort -u; }

# paste -d takes a cycling delimiter *list*, so ', ' would alternate. Join on one, then space it.
missing="$(comm -23 <(keys "$path") <(keys "$live") | paste -sd, - | sed 's/,/, /g')"
[ -n "$missing" ] || exit 0

jq -nc --arg live "${live#"$root"/}" --arg example "${path#"$root"/}" --arg keys "$missing" '{
  systemMessage: ($live + " is missing keys added to " + $example + ": " + $keys),
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ($example + " now declares keys that " + $live + " does not have: " + $keys
      + ". The setup targets only copy the example when the live file is absent, so this drift will not fix itself — add the keys to " + $live + " (it is gitignored and may hold local-only values, so do not overwrite it wholesale).")
  }
}'
