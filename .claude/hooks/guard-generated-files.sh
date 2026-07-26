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
  frontend/api/openapi.json)
    remedy='a copy of the backend contract, from which the frontend generates its API client. Run `make sync-api-contract` — editing it by hand only makes the `make lint-api-contract` CI job fail.' ;;
  frontend/src/app/api/*)
    remedy='the orval-generated API client, rewritten from frontend/api/openapi.json before every start, build, test and lint. An edit here survives until the next one of those and then vanishes. Change the contract (`make sync-api-contract`) or the generator (frontend/orval.config.ts) instead.' ;;
  frontend/.claude/skills/*)
    remedy='vendored from the angular/skills repository on GitHub and pinned by content hash in frontend/skills-lock.json. It reads like hand-written documentation but is not ours to edit — any change silently desyncs it from its pin, which is also why it sits in frontend/.prettierignore. Re-vendor from upstream instead, and put project-specific guidance in frontend/CLAUDE.md.' ;;
  frontend/skills-lock.json)
    remedy='the content-hash pin for the skills vendored into frontend/.claude/skills, written by the installer that fetches them. Editing the hash without changing the files (or the reverse) only makes the pin lie. Re-vendor from upstream instead.' ;;
  backend/prisma/migrations/*/migration.sql)
    remedy='an applied migration. Editing it desyncs the file from the database with no error anywhere. Create a new migration instead: `make backend/sh`, then `npm run db:migration:create`.' ;;
  backend/prisma/migrations/migration_lock.toml)
    remedy='written by Prisma to record which database provider the migrations were generated for. It changes only when the datasource does — never by hand.' ;;
  backend/dist/*|backend/build/*)
    remedy='backend build output, written by `nest build` in the container: `make backend/sh`, then `npm run build`. Note `make backend/build` will not do it — that is Docker'"'"'s build, it rebuilds the image.' ;;
  backend/coverage/*|backend/reports/*|frontend/coverage/*)
    remedy='test output, rewritten by `make run-unit-tests`. Fix the tests or the code it measures rather than editing the report.' ;;
  frontend/a11y/report/*|frontend/a11y/.output/*)
    remedy='the accessibility audit'"'"'s output, rewritten by `make lint-accessibility`. Fix the page it grades — the audit itself is frontend/a11y/accessibility.spec.ts.' ;;
  frontend/dist/*)
    remedy='frontend build output. Rebuild it with `docker compose run --rm app npm run build` from frontend/ — note `make frontend/build` is Docker'"'"'s, it rebuilds the image.' ;;
  acceptance-tests/target/*)
    remedy='Serenity output, rewritten by `make run-acceptance-tests` and `make render-living-documentation`. It accumulates across runs — `rm -rf acceptance-tests/target/` to start clean.' ;;
  # Listed before the generic rule below, which would otherwise swallow it: syncing the frontend
  # host tree needs one extra variable, and getting it wrong downloads browsers nothing here uses.
  frontend/node_modules/*)
    remedy='part of the host dependency tree, which exists only for the editor — the container shadows it with an anonymous volume, so nothing that runs ever reads this file. Sync it with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci` (the browsers only ever run in Dockerfile.a11y'"'"'s image), never `npm install`. Real dependency changes belong in the container: `make frontend/sh`, then `npm install <pkg>`. See frontend/CLAUDE.md.' ;;
  */node_modules/*|node_modules/*)
    remedy='part of the host dependency tree, which exists only for the editor — the container shadows it with an anonymous volume, so nothing that runs ever reads this file. Sync it with `npm ci`, never `npm install`: `npm ci` installs strictly from the lockfile, `npm install` rewrites it as a side effect. Real dependency changes belong in the container: `make <project>/sh`, then `npm install <pkg>`.' ;;
  */package-lock.json|package-lock.json)
    remedy='maintained by npm, and the container'"'"'s npm owns it — every image and CI install with `npm ci`. Add the dependency inside the container (`make <project>/sh`, then `npm install <pkg>`) and commit the result. Running `npm install` on the host churns the file against a different npm version for no real change.' ;;
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
