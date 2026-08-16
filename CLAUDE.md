# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo of independent projects, each with its own Makefile, Docker Compose stack, and CLAUDE.md:

- **`backend/`** — NestJS + Prisma + Postgres API (DDD + CQRS). Two Compose projects, both `app` + `db`:
  `nmk-backend` (development, ports 3000/5432) and `nmk-backend-test` (`NODE_ENV=test`, ports 3001/5433).
  `make up` starts both; the test stack is what the acceptance suite drives.
- **`frontend/`** — Angular app (Vitest + jsdom, ESLint, Prettier). Two Compose projects, both a
  single `app` service: `nmk-frontend` (development, port 4200, proxying `/api` to the dev backend
  on 3000) and `nmk-frontend-test` (port 4201, proxying to the backend **test** stack on 3001).
  `make up` starts both. Its Vitest unit tests are wired into the root `run-unit-tests`.
- **`acceptance-tests/`** — black-box BDD suite (Cucumber + Serenity/JS) driving the backend over
  HTTP and the frontend through a browser. Compose project `nmk-acceptance-tests` (`app`).
  `make up` starts it too, but without `--wait` — unlike the other two, there is no server to
  become healthy.

**Read the subproject's own CLAUDE.md before working inside it.** This file covers only what is cross-cutting.

## Commands

The root Makefile orchestrates the subprojects by delegating to their Makefiles. It holds no logic of its own — behaviour lives in each subproject.

```bash
make setup                  # create every project's .env files from their .example counterparts
make up                     # cold start every project (backend first, waits until healthy)
make build                  # rebuild every image
make restart                # down, then up
make migrate                # apply Prisma migrations to the dev stack (manual step, not part of `make up`)
make run-unit-tests         # backend Jest + frontend Vitest unit tests (no running stack needed)
make run-acceptance-tests   # start the test environment, then run the acceptance suite
make render-living-documentation  # render the living documentation from the last acceptance run
make open-living-documentation    # render it and open it in the browser
make run-guardrails         # run every check CI enforces, cheapest first
make fix-violations         # apply every fix those checks would demand
make ps                     # container status across all projects, in one table
make down                   # stop everything
make reset                  # stop everything and wipe both backend stacks' database volumes
make help                   # list all targets
```

Two things about `make help`: it is the default goal, so a bare `make` prints it; and it is a
`grep` for targets carrying a `## ` comment, so **a target without one is invisible** and the
`<project>/<target>` passthroughs never appear.

`make ps` is the one target that does not delegate — it is a single
`docker ps --filter name=nmk-`. A new Compose project whose `name:` is not prefixed `nmk-`
silently vanishes from it.

Code-quality checks, fanned out over every project. The bare targets are read-only; the `fix-` ones write:

```bash
make lint                # ESLint check across every project (read-only, no changes)
make fix-lint            # ESLint + auto-fix across every project
make format              # Prettier check across every project (read-only, no changes)
make fix-format          # Prettier auto-format across every project
make lint-architecture   # check the backend's DDD + CQRS layer boundaries
make lint-swagger        # check the backend's committed OpenAPI spec matches the code
make generate-swagger    # regenerate the backend's OpenAPI spec
make lint-api-contract   # check the frontend's copy of that spec matches the backend's
make sync-api-contract   # copy the backend's OpenAPI spec into the frontend
make lint-accessibility  # check the frontend passes axe's WCAG A/AA rules on every route
make fix-violations      # all four writing targets, in one go
```

`make fix-violations` runs `fix-lint`, then `fix-format`, then `generate-swagger`, then
`sync-api-contract`. Order matters:
in the backend and acceptance-tests ESLint runs Prettier as a rule and covers a superset of its
files, so `fix-lint` converges on its own there and `fix-format` is a cheap re-check. The frontend
is the exception — its ESLint config has no Prettier integration, and `ng lint` only sees
`src/**/*.ts` and `src/**/*.html` (`angular.json`'s `lintFilePatterns`), so `fix-format` is what
actually formats it. The spec is regenerated last, from already-fixed source.

Every one of these runs in a throwaway container and needs nothing up, not even the database — the swagger pair boots the app but never queries it. They stop at the first project that fails. `lint-architecture` and `lint-swagger` are backend-only — no other project has layer boundaries to enforce or an OpenAPI spec to keep in sync.

### Env files

There are **five** example files, not one per project: `backend/.env.example` and
`.env.test.example`, `frontend/.env.example` and `.env.test.example`, and
`acceptance-tests/.env.example`. Each project's `setup` creates all of its own, because the root
only ever calls `<project>/setup` and must not need to know a second stack exists.

You rarely run `setup` yourself: it is a **prerequisite** of `up`, `lint`, `format`,
`run-unit-tests`, `lint-swagger` and the rest. That is the whole reason CI needs no setup action
and no secrets — the target creates its own `.env` before it runs.

The gotcha: every setup recipe is `[ -f .env ] || cp .env.example .env`, a **no-op once `.env`
exists**. Adding a key to an example file therefore never reaches a developer's live `.env`.
`.claude/hooks/sync-env-examples.sh` exists for exactly this — it runs after a Write or Edit,
re-runs `setup`, and warns about keys present in an example but missing from the live file.

`PLAYWRIGHT_DOWNLOAD_HOST` (in `frontend/.env.example` and `acceptance-tests/.env.example`) is a
build-time mirror for Playwright's browser download. It is the most likely first-run failure where
that CDN is geo-blocked, and the two Chromium-carrying images are the ones that need it.

### Generated files are guarded

`.claude/hooks/guard-generated-files.sh` **denies** Write and Edit on generated paths and names the
command that regenerates them: `backend/docs/openapi.{json,yaml}`, `frontend/api/openapi.json`,
`frontend/src/app/api/*`, `backend/prisma/migrations/**`, `frontend/a11y/report`,
`frontend/a11y/.output`, `acceptance-tests/target/*`, every `node_modules/` and every
`package-lock.json`. Reach for the generating target instead — `make generate-swagger`,
`make sync-api-contract`, `make migrate`. It covers Write and Edit only, deliberately: a Bash
regex would block the sanctioned path, since `make generate-swagger` legitimately rewrites
`docs/openapi.*` through a bind mount.

`lint-accessibility` is the exception on both counts: frontend-only, since no other project renders a
page, and the one check that needs its subject **running**. It starts the frontend itself and drives
a headless Chromium at it, because axe grades rendered output — in jsdom, colour contrast is not
merely unchecked but uncheckable. It leaves the dev server up; `make down` afterwards. See
`frontend/CLAUDE.md`.

Reach a single project's Makefile with `<project>/<target>`: `make backend/sh`, `make backend/logs`, `make acceptance-tests/run`.

Use the slash form, not `make backend up` — Make would read `up` as a second root goal and start every stack a second time. For the same reason, targets taking an argument (`make npm <script>`) have no passthrough; run them from the subproject, or use the dedicated root target where one exists (`make migrate`).

One trap in that passthrough: each subproject's Makefile ends in a `%:` / `@:` catch-all, which is
what makes `make npm <script>` work — but it also means **a typo'd target inside a subproject
succeeds silently**. `make backend/lnt` exits 0 and does nothing. Root-level typos error normally.

`make run-acceptance-tests` brings up the backend test stack, then the **frontend test stack**
(`frontend test-up`, not `up`), then the suite — the same order as `PROJECTS`. All three steps are
load-bearing: the suite drives a real browser at the frontend on **4201**, so dropping the middle
step now fails the run rather than merely covering less. `test-up` rather than `up` is what points
that browser at the same backend the suite truncates between scenarios, instead of at the
developer's dev stack.

The suite is **blended**: all thirty-five of its examples are automated, and of those nine drive
the UI — the sign-up journey, the duplicate-email rejection, the successful password reset and six
of login's eight scenarios — while the remaining twenty-six stay black-box HTTP against the
backend. That 26% split follows _BDD in Action_ ch10's four reasons to write a UI test, and the
feature file itself knows nothing about it: each step's grammatical voice decides which door it
goes through, so there are no `@ui`/`@api` tags to keep in sync. `acceptance-tests/CLAUDE.md` has
the table and the reasoning; change the ratio there, deliberately, not by drift.

**No example is pending today**, but the mechanism is worth knowing, because it is how this repo
writes specification ahead of implementation. Gherkin the business has agreed but nobody has
automated is left untagged and *runs*: its step definitions `return 'pending'`, which
`strict: false` in `cucumber.cjs` keeps out of the failure statuses, so CI stays green *and* the
living documentation still carries the scenario, marked Pending. That is not what `@wip` is for —
that tag means the business hasn't settled the scenario, and excludes it from the run and from the
documentation. Both feature areas that used it have since been automated: forgot-password was the
usual kind, Gherkin written before the backend could satisfy it, while **login was the inverse and
the more surprising case** — backend and frontend implemented all of it, and it was the automation
that was outstanding. `acceptance-tests/CLAUDE.md` has the table and the Door column recording
which scenarios drive the browser.

What makes the frontend drivable is its markup: a `<label for>` on every input, a real
`<button type="submit">`, no `div` click targets. The suite locates elements **by label text**
rather than by id or a `data-test` attribute — there are none — because `make lint-accessibility`
already fails the build when a label goes missing. For those locators the accessibility gate really
does double as the locator contract, and weakening one weakens the other.

**But the gate does not cover everything the suite depends on**, and it is worth knowing where it
stops. Alongside the accessible names, the suite anchors on seven structural selectors that nothing
gates: `form app-text-field`, `form button`, `form [role="alert"]`, `form [role="status"]` and
`.field__error` (`acceptance-tests/screenplay/ui/form.ts`), `dl div` (`profile-record.ts`), and
`app-site-header button|a` (`site-header.ts`). Two of those are provably outside the gate's reach:
the audit visits each route in its **initial** state, and `frontend/a11y/accessibility.spec.ts`
says so outright — "a form's *error* state is not reachable by navigation, so nothing here grades
it". So renaming the `field__error` class, dropping the `app-text-field` wrapper, or flattening
`<dl><div>` breaks the acceptance suite with no check failing first. Keep the no-`data-test`
convention; just don't assume the a11y gate is protecting all of it.

`make up` does **not** migrate. The acceptance suite applies migrations itself (`POST /api/testing/migrations` in its `BeforeAll` hook), so `make run-acceptance-tests` is unaffected; run `make migrate` when driving the app by hand.

`make migrate` reaches the dev stack only — it is `docker compose exec` against `nmk-backend`. The test
stack never needs it, because the suite migrates it through that endpoint. And that endpoint exists
only there: `TestingModule` mounts at `NODE_ENV === 'test'`, which is exactly why the second stack
exists rather than the suite reusing the dev one. See `backend/CLAUDE.md`.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests, on pushes to `main`, and on `workflow_dispatch`.
Eight jobs run in parallel, one per check:
`make format`, `make lint`, `make lint-architecture`, `make lint-swagger`, `make lint-api-contract`,
`make lint-accessibility`, `make run-unit-tests`, `make run-acceptance-tests`. Each job is a checkout plus a single root target
— no npm, no Node setup, no secrets, because every target already builds its own container and
creates its `.env` from the committed `.env.example` (see [Env files](#env-files)).
`lint-api-contract` is the one exception that needs no container at all: it is a `cmp` between two
files in the checkout. The two artifact-uploading jobs are the only ones with extra steps.

**CI does not run on every change.** Both the `pull_request` and `push` triggers carry the same
`paths-ignore`:

```yaml
paths-ignore:
  - '**/*.md'
  - '.claude/**'
  - '**/.claude/**'
```

That is a wider net than "docs": it covers every `CLAUDE.md` and both READMEs, but also
`.claude/settings.json`, the two **executable hooks** in `.claude/hooks/`, and
`frontend/.claude/skills/**`. Change a hook script and nothing verifies it. `workflow_dispatch`
carries no filter and is the escape hatch.

Worth knowing if branch protection is ever configured: with `pull_request` + `paths-ignore`, GitHub
reports the skipped jobs as *not run* rather than as skipped-successes, so a docs-only PR would sit
unmergeable behind any of the eight marked as required.

A `concurrency` group of `ci-${{ github.ref }}` with `cancel-in-progress` means a new push to a PR
cancels the run it supersedes.

**A new gate means a new root target, a job that calls it, and a line in `run-guardrails`.**
Never inline a command into the workflow: the Makefile stays the single source of truth, so what
CI enforces is exactly what runs locally. Each job cold-builds its image, since a fresh runner
has no Docker layer cache.

`make run-guardrails` is the local mirror of these eight jobs — the one command that answers "will
CI pass?". It runs them sequentially rather than in parallel, cheapest first, so it stops at the
first failure. That order is **not** the order they are listed in above, which is CI's; it is:

```
lint-api-contract → format → lint → lint-architecture → lint-swagger
                  → run-unit-tests → lint-accessibility → run-acceptance-tests
```

`lint-api-contract` goes first because it is a bare `cmp` with no container, and the two that need
something running go last. It is a convenience, not a gate: CI keeps its eight parallel jobs, which
finish sooner and name the broken check without reading a log. Because it ends in
`run-acceptance-tests`, it leaves the backend test stack, the frontend and the acceptance-tests
container running; `make down` afterwards.

`make fix-violations` is its writing counterpart — one command that applies every automated fix
the checks would otherwise demand, so nothing avoidable reaches CI. No job calls it and none
should: CI only ever runs the read-only checks.

The accessibility job uploads `frontend/a11y/report` as the `accessibility-report` artifact, pass or
fail: axe's own report shows the offending element, where the job log only names it.

The acceptance-tests job also renders the living documentation
(`make render-living-documentation`) and uploads `acceptance-tests/target/site/serenity` as the
`living-documentation` artifact — on every run, pass or fail. A failing UI step attaches a
screenshot to that artifact, for the same reason the accessibility job uploads axe's report: the
job log can name the element, only the picture shows the page.

That job's image carries Chromium, so it is the slowest to cold-build after the accessibility one.
Nothing else about the workflow changed when the suite started driving the UI — `run-acceptance-tests`
already brought the frontend test stack up, which is exactly what that step was reserved for.

A separate workflow, `.github/workflows/publish-living-documentation.yml`, publishes that
documentation to a durable URL. On a push to `main` — subject to the same three `paths-ignore`
patterns as CI — or on `workflow_dispatch`, it re-runs the suite, renders the site with the same
two targets, and deploys `acceptance-tests/target/site/serenity` to GitHub Pages
(`actions/deploy-pages`). Where CI's artifact is per-run and download-only, this keeps the latest
`main` documentation browsable at the repo's Pages URL. It is a publish step, not a gate — no
root target, no `run-guardrails` line. Enabling it once requires setting Pages' source to
"GitHub Actions" in the repository settings.

Two asymmetries with CI, both of which have surprised someone before. Its `concurrency` group is
`pages` with `cancel-in-progress`, so a second push to `main` in quick succession **cancels the
in-flight publish** — that, not a build failure, is the usual answer to "why didn't Pages update".
And the render step here is not `continue-on-error`, where `ci.yml`'s is: a render failure fails
this job but never CI's.

## The dependency runs one way

`acceptance-tests` drives `backend` over HTTP and `frontend` through a browser, and knows nothing
else about either — no importing code from them, no direct database access, no reading a frontend
source file to learn a selector. Two doors, both of them public: the API a client would call, and
the page a person would look at. A precondition that can't be set up through one of those two
doesn't get set up.

**Backend and frontend code and docs must never reference the acceptance-tests project.** The root
is the only place they are named together. When adding a project to the root Makefile's `PROJECTS`,
keep start-up order: anything that talks to another project comes after it.

The one place the suite leans on a frontend detail is its **locators**, and it prefers the
accessible name over the implementation — a field is found by its visible `<label>`, a profile
value by the `<dt>` beside it. `make lint-accessibility` enforces that much, which is why the
frontend carries no `data-test` attributes and needs none. Where the suite has no accessible name
to reach for it falls back to a structural selector, and those are ungated; see
[the markup contract](#commands) above for the list and which two are genuinely unprotected.

`frontend` depends on the backend's *contract*, not on the backend project. It generates its HTTP
client with orval from **its own copy** of the spec, `frontend/api/openapi.json`, so nothing under
`frontend/` ever resolves a path into `backend/` and the project still builds if you copy it
elsewhere. At runtime the same holds: the generated client emits relative routes, and
`frontend/proxy.conf.mjs` forwards `/api` to whatever `API_PROXY_TARGET` names — a URL, not a path,
and the only place in that project the backend's address appears. It is `host.docker.internal`
because the two projects share no Docker network; the backend is reachable only through the ports
it publishes on the host. The copy is maintained here and only here — `make sync-api-contract` writes it,
`make lint-api-contract` fails when it drifts. The generated client itself is gitignored and rebuilt
by npm `pre*` hooks on every start, build, test and lint; see `frontend/CLAUDE.md`.

**The backend now knows one thing about the frontend, and only one**: `APP_BASE_URL`, the origin it
builds a password-reset link against (`{APP_BASE_URL}/reset-password?token=…`). That is the mirror
image of `API_PROXY_TARGET` and follows the same rule — a URL, not a path, so no file under
`backend/` resolves into `frontend/` and neither project stops building without the other. Its value
is per-stack, and the pairing is what matters: the dev backend points at `4200`, the **test** backend
at `4201`. Cross them and the emailed link opens a UI wired to the other stack's database. Nothing
checks the pairing, so it is `.env.example` and `.env.test.example` that have to be right.

The two spec checks compose: `lint-swagger` proves `backend/docs/openapi.json` matches the backend
code, so `lint-api-contract` only has to prove the frontend's copy matches that file. Together they
guarantee the generated client matches the running API. That is also why `fix-violations` runs
`sync-api-contract` last — the copy is taken from an already-regenerated spec.
