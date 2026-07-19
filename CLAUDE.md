# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo of independent projects, each with its own Makefile, Docker Compose stack, and CLAUDE.md:

- **`backend/`** — NestJS + Prisma + Postgres API (DDD + CQRS). Two Compose projects, both `app` + `db`:
  `nmk-backend` (development, ports 3000/5432) and `nmk-backend-test` (`NODE_ENV=test`, ports 3001/5433).
  `make up` starts both; the test stack is what the acceptance suite drives.
- **`acceptance-tests/`** — black-box BDD suite (Cucumber + Serenity/JS) driving the backend over HTTP. Compose project `nmk-acceptance-tests` (`app`).
- **`frontend/`** — empty placeholder. No Makefile yet, so it is not in `PROJECTS`.

**Read the subproject's own CLAUDE.md before working inside it.** This file covers only what is cross-cutting.

## Commands

The root Makefile orchestrates the subprojects by delegating to their Makefiles. It holds no logic of its own — behaviour lives in each subproject.

```bash
make up                     # cold start every project (backend first, waits until healthy)
make migrate                # apply Prisma migrations to the dev stack (manual step, not part of `make up`)
make run-unit-tests         # backend Jest unit tests (no running stack needed)
make run-acceptance-tests   # start the test environment, then run the acceptance suite
make open-living-documentation  # render the living documentation and open it in the browser
make run-guardrails         # run every check CI enforces, cheapest first
make fix-violations         # apply every fix those checks would demand
make ps                     # container status across all projects, in one table
make down                   # stop everything
make reset                  # stop everything and wipe both backend stacks' database volumes
make help                   # list all targets
```

Code-quality checks, fanned out over every project. The bare targets are read-only; the `fix-` ones write:

```bash
make lint                # ESLint check across every project (read-only, no changes)
make fix-lint            # ESLint + auto-fix across every project
make format              # Prettier check across every project (read-only, no changes)
make fix-format          # Prettier auto-format across every project
make lint-architecture   # check the backend's DDD + CQRS layer boundaries
make lint-swagger        # check the backend's committed OpenAPI spec matches the code
make generate-swagger    # regenerate the backend's OpenAPI spec
make fix-violations      # all three writing targets, in one go
```

`make fix-violations` runs `fix-lint`, then `fix-format`, then `generate-swagger`. Order matters:
ESLint runs Prettier as a rule and covers a superset of its files, so `fix-lint` converges on its
own and `fix-format` is a cheap re-check; the spec is regenerated last, from already-fixed source.

Every one of these runs in a throwaway container and needs nothing up, not even the database — the swagger pair boots the app but never queries it. They stop at the first project that fails. `lint-architecture` and `lint-swagger` are backend-only — no other project has layer boundaries to enforce or an OpenAPI spec to keep in sync.

Reach a single project's Makefile with `<project>/<target>`: `make backend/sh`, `make backend/logs`, `make acceptance-tests/render-living-documentation`.

Use the slash form, not `make backend up` — Make would read `up` as a second root goal and start every stack a second time. For the same reason, targets taking an argument (`make npm <script>`) have no passthrough; run them from the subproject, or use the dedicated root target where one exists (`make migrate`).

`make up` does **not** migrate. The acceptance suite applies migrations itself (`POST /api/testing/migrations` in its `BeforeAll` hook), so `make run-acceptance-tests` is unaffected; run `make migrate` when driving the app by hand.

`make migrate` reaches the dev stack only — it is `docker compose exec` against `nmk-backend`. The test
stack never needs it, because the suite migrates it through that endpoint. And that endpoint exists
only there: `TestingModule` mounts at `NODE_ENV === 'test'`, which is exactly why the second stack
exists rather than the suite reusing the dev one. See `backend/CLAUDE.md`.

## Continuous integration

`.github/workflows/ci.yml` gates every pull request, and also runs on each push to `main` and on
`workflow_dispatch`. Six jobs run in parallel, one per check:
`make format`, `make lint`, `make lint-architecture`, `make lint-swagger`, `make run-unit-tests`,
`make run-acceptance-tests`. Each job is a checkout plus a single root target — no npm, no Node
setup, no secrets, because every target already builds its own container and creates its `.env`
from the committed `.env.example`.

**A new gate means a new root target, a job that calls it, and a line in `run-guardrails`.**
Never inline a command into the workflow: the Makefile stays the single source of truth, so what
CI enforces is exactly what runs locally. Each job cold-builds its image, since a fresh runner
has no Docker layer cache.

`make run-guardrails` is the local mirror of these six jobs — the one command that answers "will
CI pass?". It runs them sequentially rather than in parallel, cheapest first, so it stops at the
first failure. It is a convenience, not a gate: CI keeps its six parallel jobs, which finish
sooner and name the broken check without reading a log. Because it ends in
`run-acceptance-tests`, it leaves the backend test stack and the acceptance-tests container
running; `make down` afterwards.

`make fix-violations` is its writing counterpart — one command that applies every automated fix
the checks would otherwise demand, so nothing avoidable reaches CI. No job calls it and none
should: CI only ever runs the read-only checks.

The acceptance-tests job also renders the living documentation
(`make render-living-documentation`) and uploads `acceptance-tests/target/site/serenity` as the
`living-documentation` artifact — on every run, pass or fail.

A separate workflow, `.github/workflows/publish-living-documentation.yml`, publishes that
documentation to a durable URL. On every push to `main` it re-runs the suite, renders the site
with the same two targets, and deploys `acceptance-tests/target/site/serenity` to GitHub Pages
(`actions/deploy-pages`). Where CI's artifact is per-run and download-only, this keeps the latest
`main` documentation browsable at the repo's Pages URL. It is a publish step, not a gate — no
root target, no `run-guardrails` line. Enabling it once requires setting Pages' source to
"GitHub Actions" in the repository settings.

## The dependency runs one way

`acceptance-tests` drives `backend` over HTTP and knows nothing else about it — no importing backend code, no direct database access.

**Backend code and docs must never reference the acceptance-tests project.** The root is the only place both are named. When adding a project to the root Makefile's `PROJECTS`, keep start-up order: anything that talks to the backend comes after it.
