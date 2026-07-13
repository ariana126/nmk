# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Black-box BDD acceptance suite (Cucumber + TypeScript + supertest) for the sibling `../backend` project. Tests only ever talk to the backend over HTTP — no importing backend code, no direct DB mutation from step definitions. This is one of two independent test layers for the backend; the other is its Jest unit tests (see `../backend/CLAUDE.md`).

## Commands

Runs in Docker via the Makefile (prerequisites: Docker, Docker Compose, `make`). The backend + Postgres stack must already be running (`../backend`, via its own `make up`) since this suite hits a live `BASE_URL`.

```bash
make up                  # build (if needed) and start this container in the background
make down                # stop and remove the container
make sh                  # open a shell in the container
make run                 # run the full acceptance suite (npm test) inside the container
make npm <script>        # run any package.json script inside the container
```

Running outside Docker (needs Node 22, and `.env` copied from `.env.example` with `BASE_URL` pointing at a running backend):

```bash
npm test                                          # runs cucumber-js --tags 'not @wip'
npx cucumber-js specs/identity/login.feature      # single feature file
npx cucumber-js specs/identity/login.feature:15   # single scenario, by line number
npx cucumber-js --tags '@wip'                     # run only @wip scenarios
```

## Architecture

```
specs/<module>/*.feature          # Gherkin scenarios, organized to mirror backend/src/modules/<module>
step_definitions/common/          # cross-domain, reusable steps (HTTP/problem-detail assertions, auth)
step_definitions/<module>/        # domain-specific steps (one file per feature area)
support/world.ts                  # AppWorld: supertest client, last response, accessToken
support/hooks.ts                  # BeforeAll/Before: DB reset via backend testing endpoints
cucumber.cjs                      # loads support/*.ts and step_definitions/**/*.steps.ts via ts-node
```

- **Test isolation**: `support/hooks.ts` calls the backend's testing-only endpoints — `POST /api/testing/migrations` once in `BeforeAll`, `POST /api/testing/truncate` before every scenario — to reset state. These endpoints only exist on the backend when `NODE_ENV !== 'production'`.
- **`AppWorld`** (`support/world.ts`) is the shared per-scenario context: `client` (supertest bound to `BASE_URL`), `response` (last HTTP response), `accessToken` (set on login, cleared on logout, attached as `Authorization: Bearer` by steps that need auth).
- **`@wip` tag**: marks feature files/scenarios written ahead of backend implementation. Excluded from `npm test` by default (`--tags 'not @wip'`); remove the tag once the corresponding backend endpoint exists and the scenario passes.

## Step design conventions

- One step per concern: generic HTTP/envelope assertions (status code, RFC 9457 shape) live in `step_definitions/common/`; steps asserting a specific business field live in the domain file.
- RFC 9457 problem detail assertions: prefer asserting on `type` (always present, e.g. `https://my-api-doc.dev/problems/<slug>` or `about:blank`) over `detail` (optional per the RFC). `the response should be a valid problem detail` in `common/http.steps.ts` covers the generic envelope (Content-Type, `type`, `title`, `status`); domain steps then assert the specific `type` value.
- Precondition/setup steps that can't be done by direct DB access (black-box constraint) go through the real API (e.g. `a user with email "..." already exists` calls `POST /api/users`).

## Environment

`.env` (copied from `.env.example` by `make setup`, run automatically by `make up`):
- `BASE_URL` — backend base URL the suite runs against.
- `DATABASE_URL` — Postgres connection string (declared for future direct-DB assertions; not currently read by any step/support code — `pg` is a dependency but unused today).
