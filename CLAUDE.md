# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo of independent projects, each with its own Makefile, Docker Compose stack, and CLAUDE.md:

- **`backend/`** — NestJS + Prisma + Postgres API (DDD + CQRS). Compose project `nmk-backend` (`app`, `db`).
- **`acceptance-tests/`** — black-box BDD suite (Cucumber + Serenity/JS) driving the backend over HTTP. Compose project `nmk-acceptance-tests` (`app`).
- **`frontend/`** — empty placeholder.

**Read the subproject's own CLAUDE.md before working inside it.** This file covers only what is cross-cutting.

## Commands

The root Makefile orchestrates the subprojects by delegating to their Makefiles. It holds no logic of its own — behaviour lives in each subproject.

```bash
make up                     # cold start every project (backend first, waits until healthy)
make migrate                # apply Prisma migrations (manual step, not part of `make up`)
make run-unit-tests         # backend Jest unit tests (no running stack needed)
make run-acceptance-tests   # start the test environment, then run the acceptance suite
make run-guardrails         # run every check CI enforces, cheapest first
make ps                     # container status across all projects, in one table
make down                   # stop everything
make reset                  # stop everything and wipe the database volume
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
```

Every one of these runs in a throwaway container and needs nothing up, not even the database — the swagger pair boots the app but never queries it. They stop at the first project that fails. `lint-architecture` and `lint-swagger` are backend-only — no other project has layer boundaries to enforce or an OpenAPI spec to keep in sync.

Reach a single project's Makefile with `<project>/<target>`: `make backend/sh`, `make backend/logs`, `make acceptance-tests/render-living-documentation`.

Use the slash form, not `make backend up` — Make would read `up` as a second root goal and start every stack a second time. For the same reason, targets taking an argument (`make npm <script>`) have no passthrough; run them from the subproject, or use the dedicated root target where one exists (`make migrate`).

`make up` does **not** migrate. The acceptance suite applies migrations itself (`POST /api/testing/migrations` in its `BeforeAll` hook), so `make run-acceptance-tests` is unaffected; run `make migrate` when driving the app by hand.

## Continuous integration

`.github/workflows/ci.yml` gates every pull request. Six jobs run in parallel, one per check:
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

The acceptance-tests job also renders the living documentation
(`make render-living-documentation`) and uploads `acceptance-tests/target/site/serenity` as the
`living-documentation` artifact — on every run, pass or fail.

## The dependency runs one way

`acceptance-tests` drives `backend` over HTTP and knows nothing else about it — no importing backend code, no direct database access.

**Backend code and docs must never reference the acceptance-tests project.** The root is the only place both are named. When adding a project to the root Makefile's `PROJECTS`, keep start-up order: anything that talks to the backend comes after it.
