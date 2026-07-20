#!/usr/bin/env bash
#
# PreToolUse guard for Write|Edit. Refuses hand edits to generated files and names the
# command that regenerates them, so the refusal teaches the fix instead of just blocking.
#
# Covers the Write and Edit tools only. A Bash redirect can still write these paths, and
# that is deliberate: `make generate-swagger` legitimately rewrites docs/openapi.* through
# a bind mount, so a Bash-command regex would block the sanctioned path. This is a guardrail
# against absent-minded edits, not a security boundary.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

path="$(jq -r '.tool_input.file_path // empty')"
[ -n "$path" ] || exit 0

# Match on a repo-relative path so the patterns stay readable and machine-independent.
rel="${path#"$root"/}"

case "$rel" in
  backend/docs/openapi.json|backend/docs/openapi.yaml)
    remedy='generated from the code by backend/src/generate-swagger.ts. Run `make generate-swagger` — editing it by hand only makes the `make lint-swagger` CI job fail against the real source.' ;;
  backend/prisma/migrations/*/migration.sql)
    remedy='an applied migration. Editing it desyncs the file from the database with no error anywhere. Create a new migration instead: `make backend/sh`, then `npm run db:migration:create`.' ;;
  backend/dist/*|backend/coverage/*|backend/reports/*)
    remedy='backend build output. Rebuild with `make backend/build` (or `make run-unit-tests` for coverage) rather than editing it.' ;;
  acceptance-tests/target/*)
    remedy='Serenity output, rewritten by `make run-acceptance-tests` and `make render-living-documentation`. It accumulates across runs — `rm -rf acceptance-tests/target/` to start clean.' ;;
  */node_modules/*|node_modules/*)
    remedy='part of an installed dependency tree. Run `npm install` in that project; never patch node_modules in place.' ;;
  */package-lock.json|package-lock.json)
    remedy='maintained by npm. Run `npm install <pkg>` in that project and commit the result.' ;;
  *)
    exit 0 ;;
esac

jq -nc --arg path "$rel" --arg remedy "$remedy" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ($path + " is " + $remedy)
  }
}'
