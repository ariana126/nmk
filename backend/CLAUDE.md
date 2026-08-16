# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Skills.** The authority on this stack's design and anti-patterns is the `handbook:architecture-guideline`, `handbook:oop-guideline`, and `handbook:test-guideline` skills — invoke the ones that fit before writing code.

## Commands

The app runs in Docker; the Makefile wraps Docker Compose. Prerequisites: Docker, Docker Compose, `make`.

```bash
make up                  # build (if needed) and start both stacks, waiting until every container is healthy
make down                # stop and remove both stacks' containers
make restart             # down, then up
make build               # rebuild the image — dev stack only, unlike up/down/reset
make reset               # stop both stacks and wipe both database volumes
make logs                # tail logs from the dev stack
make sh                  # open a shell in the dev stack's app container
make ps                  # status of every container in both stacks
make npm <script>        # run any package.json script inside the dev stack's app container
make run-unit-tests      # Jest unit tests (src/**/*.spec.ts), in a one-off container
make help                # list all available make targets
```

Jest is configured inline in `package.json` (`rootDir: src`, `testRegex: .*\.spec\.ts$`) — there is
no `jest.config.js` to look for.

### Two stacks

There are two Docker Compose projects, and `up`, `down` and `reset` act on **both**:

| | dev | test |
|---|---|---|
| Compose project | `nmk-backend` | `nmk-backend-test` |
| Files | `docker-compose.yml` | `+ docker-compose.test.yml` |
| Env file | `.env` (from `.env.example`) | `.env.test` (from `.env.test.example`) |
| `NODE_ENV` | `development` | `test` |
| App / Postgres port | 3000 / 5432 | 3001 / 5433 |
| Logging | pretty-printed, `debug` | `LOG_LEVEL=silent` |

`docker-compose.test.yml` is five lines long: it names the second Compose project and swaps the env
file, nothing more. The test stack is the same image with different values. Separate ports and
separate volumes are what make them independent.

Target the test stack on its own:

```bash
make test-up             # build (if needed) and start just the test stack, waiting until healthy
make test-down           # stop and remove just the test stack
make test-reset          # stop the test stack and wipe its database volume
make test-setup          # create .env.test from .env.test.example (make setup already does this)
```

**Why the split.** `TestingModule` — which exposes an endpoint that truncates every table — mounts only
when `NODE_ENV === 'test'`. So an external test runner needs a stack running at that value, and the
split guarantees the endpoint is unreachable on the dev stack while a run in progress can never touch
dev data. The ports differ for the same reason: both stacks can be up at once, which is the normal
state after `make up`.

`make run-unit-tests` needs nothing running: it uses `docker compose run --rm --no-deps`, so the
tests get a throwaway container with no database behind it and no published ports, which is why
it is safe to run while `make up`'s stack owns 3000. The lint and format targets below work the
same way, for the same reason.

Code-quality checks. The bare targets are read-only; the `fix-` ones write:
```bash
make lint                # ESLint check (read-only, no changes)
make fix-lint            # ESLint + auto-fix
make format              # Prettier check (read-only, no changes)
make fix-format          # Prettier auto-format
make lint-architecture   # check the DDD + CQRS layer boundaries
make lint-swagger        # check docs/openapi.* still matches the code (read-only)
make generate-swagger    # rewrite docs/openapi.json and docs/openapi.yaml
```

`docs/openapi.json` and `docs/openapi.yaml` are committed, so they drift the moment a controller,
DTO, or `@Api*` decorator changes without a regeneration. `make lint-swagger` rebuilds the document
in memory and compares it to what is on disk; `make generate-swagger` is the fix. Both boot the app
but never query the database — the Prisma driver adapter connects lazily — so like every other
quality check they run in a throwaway container and need nothing up.

Two things about that spec worth knowing. It is generated **without** `NODE_ENV=test`, so the
testing-support endpoints are deliberately absent from it despite carrying `@ApiTags` — the
committed document describes four paths. And `nest-cli.json` enables the `@nestjs/swagger` CLI
plugin (`classValidatorShim`, `introspectComments`), which injects DTO types and doc comments at
**compile** time; that is why both scripts go through `nest build` and cannot be run under ts-node.

Regenerating the spec also has a consequence outside this project: a copy of it is kept elsewhere
in the monorepo and a root-level check compares the two. After changing a controller or DTO, run
`make fix-violations` from the repo root rather than `make generate-swagger` here, or that check
fails on a file this project does not own.

None of the checks above require a running stack. The ones that write (`fix-lint`, `fix-format`,
`generate-swagger`) still land their changes in the working tree, since the repo is bind-mounted
into the container.

Make targets are verb-object and hyphenated (`fix-format`, `lint-architecture`); the
package.json scripts they wrap keep their own names (`format:fix`, `depcruise`). Prefer the
targets over `make npm <script>` — because `lint` and `format` are now real targets,
`make npm lint` runs the linter twice (once through the passthrough, once as a second goal).
(`.dependency-cruiser.cjs`'s header comment still says `make npm depcruise`; it is wrong for that
reason — use `make lint-architecture`.)

**ESLint embeds Prettier here** (`eslint-plugin-prettier/recommended`, with `prettier/prettier` as
an error), so `make lint` fails on formatting alone and `make fix-lint` reformats as it goes.
`format` and `fix-format` are a cheap re-check over the same files, not an independent gate.
`simple-import-sort` is likewise an error, not a warning — and reordering imports is one way to
resurface the barrel crash that `no-own-package-barrel` exists to prevent (see below).

`eslint.config.mjs` carries nine deliberate rule suppressions, each with the reasoning above it —
`injectable-should-be-provided` is off because of the barrel-spread DI convention, and so on. They
are decisions, not oversights; don't "clean them up". Eight sit in the final rules block and apply
everywhere; the ninth, `sonarjs/no-hardcoded-passwords`, is scoped to `**/*.spec.ts` in a block of
its own, so production code is still covered.

`tsconfig.json` is looser than you may assume: `noImplicitAny` and `strictBindCallApply` are
**off**, only `strictNullChecks` is on, and `@typescript-eslint/no-explicit-any` is disabled to
match. Code written against a strict-TS assumption will not be caught by the compiler here.

Other scripts, via `make npm <script>`:
```bash
make npm start:dev           # (already running via `make up`) hot reload on port 3000
make npm test:cov            # Jest with coverage
make npm db:migrate          # apply Prisma migrations (manual step after `make up`)
make npm db:generate-client  # regenerate Prisma client
```

`make npm` runs `docker compose exec` against the **dev** stack, so `make npm db:migrate` migrates
`nmk-backend` only. The test stack migrates itself, through `POST /api/testing/migrations`.

Run a single Jest test file (from a shell inside the container via `make sh`):
```bash
npx jest path/to/file.spec.ts
```

`make up` passes `--wait` to Docker Compose for each stack, so it only returns once every container
reports healthy — the `db` service via `pg_isready`, the `app` service via the `GET /api/health`
liveness probe.

## Environment

Neither `.env` nor `.env.test` is committed. `make setup` creates **both**, copying them from the
committed `.env.example` / `.env.test.example`; `make up` runs it for you. Both stacks belong to
this project, so one `setup` covers the whole project — which is what lets the root Makefile call
a plain `setup` per project without knowing the backend has a second env file. (`make test-setup`
still exists on its own, for driving the test stack in isolation.) Neither copy overwrites an
existing file, so local edits survive. The examples hold working local defaults, which is why
every CI job can create its own env and run with no secrets.

| Variable | Notes |
|---|---|
| `NODE_ENV` | `development` / `test` / `production`. Gates `TestingModule` (`=== 'test'`), the clock implementation (`=== 'test'`), and Swagger UI + pretty logs (`!== 'production'`). |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` / `_PORT` | Compose builds `DATABASE_URL` from these — don't set it directly. |
| `JWT_SECRET` | Read via `ConfigService.getOrThrow` in `AuthModule`; boot fails without it. |
| `APP_BASE_URL` | Where the browser-facing app lives — `http://localhost:4200`, and `4201` in `.env.test`. Read via `ConfigService.getOrThrow` in `IdentityModule`, so boot fails without it. The only thing built from it is the password-reset link, `{APP_BASE_URL}/reset-password?token=<secret>`, whose exact shape is a contract with whoever reads the email. |
| `APP_PORT` | **Not in `.env.example`.** Defaults to 3000 via `${APP_PORT:-3000}` in Compose; `.env.test` sets 3001. |
| `STUDIO_PORT` | **Not in `.env.example`.** Prisma Studio; defaults to 5555 the same way, test stack 5556. |
| `LOG_LEVEL` | **Not in `.env.example`.** Overrides the pino level, defaulted in `app.module.ts`. The test stack sets `silent` to keep suite output readable. |

The bottom three are real and settable, but you will not find them by reading `.env.example` —
only `.env.test.example` declares them. Their defaults live in `docker-compose.yml` and
`app.module.ts`.

## Editor / host node_modules

The app needs no host `node_modules` — everything runs in Docker. But an editor needs one on disk
for IntelliSense and type-checking, and it is **separate** from the container's: `docker-compose.yml`
bind-mounts `./:/app` while an anonymous volume (`- /app/node_modules`) shadows it, so the container
keeps the `node_modules` its image built via `npm ci` and never sees the host copy. The host copy
changes only when you install locally.

After the container's dependencies or the Prisma schema change, sync the host with **`npm ci`**
(needs Node 24 locally), then restart the editor's TS/language server:

```bash
npm ci   # installs exactly from package-lock.json and runs postinstall (prisma generate)
```

**Never `npm install` for this sync.** `npm ci` installs strictly from `package-lock.json` and never
rewrites it; `npm install` rewrites the lockfile as a side effect, and because a host npm version can
differ from the container's, that churns `package-lock.json` (e.g. `"peer": true` metadata) for no
real change. The committed lockfile is the shared source of truth and the container's npm owns it (CI
installs via `npm ci`). Make **real** dependency changes inside the container (`make sh` → `npm
install`) and commit them, so `npm ci` everywhere stays consistent.

This is host-only, for the editor. The container side of the same split — refreshing a stale
in-container `node_modules`/Prisma client after a schema change — is a rebuild with
`--renew-anon-volumes`, unrelated to this.

## Architecture

This project implements **DDD + CQRS** with a strict layered structure. New features follow the same vertical-slice pattern as the `identity` module.

### Layer Layout (per module)

```
src/modules/<domain>/
├── domain/               # Pure business logic — no framework imports
│   ├── <name>.aggregate.ts
│   ├── events/           # Domain events (implement DomainEvent)
│   └── service/          # Port interfaces (Repository, external services)
├── application/
│   ├── commands/         # ICommandHandler implementations, one directory each
│   │   └── index.ts      # Barrel — the module spreads it into `providers`
│   ├── queries/          # IQueryHandler + ReadModel DTOs
│   │   └── index.ts
│   └── exceptions/       # ApplicationException subclasses
│       └── index.ts
└── infrastructure/
    ├── <domain>.module.ts       # The NestJS module for the whole slice
    ├── <adapter>.ts             # Port implementations live loose here
    │                            #   (bcrypt-password-hasher.ts, jwt-token.service.ts)
    ├── http/
    │   ├── controllers/
    │   │   ├── index.ts         # Barrel — spread into `controllers`
    │   │   └── <name>/          # One directory per controller
    │   │       ├── <name>.controller.ts
    │   │       └── dto/         # Input DTOs (class-validator decorators)
    │   └── exception.mapper.ts  # Domain → Problem Detail mapping
    └── persistence/
        ├── <name>.repository.ts  # Extends PrismaEntityRepository
        └── <name>.mapper.ts      # Domain ↔ Prisma model conversion
```

The barrels are load-bearing: `identity.module.ts` spreads `Controllers`, `CommandHandlers` and
`QueryHandlers` rather than listing each one, which is also why the
`injectable-should-be-provided` ESLint rule is off. DTOs nest **under their controller**, not in a
shared `http/dto/` directory.

### Framework Abstractions (`src/framework/`)

- **`AggregateRoot`** — extends `Entity`; call `recordThat(event)` to emit domain events; repository base class calls `releaseEvents()` and publishes via EventBus on save.
- **`ValueObject`** — value equality. Validate in a **static factory** with a private constructor, as `Identity` and `Email` do; see `src/framework/CLAUDE.md` for why, and for what a thrown plain `Error` costs you.
- **`Identity`** / **`Email`** — core value objects; use `Identity.new()` and `Email.fromString()`.
- **`EntityRepository<T>`** — abstract base: `find`, `get` (throws if missing), `save`.
- **`PrismaEntityRepository<Domain, Prisma>`** — concrete Prisma base; subclasses implement `toDomain()` and `toPersistence()`. `save()` is an upsert keyed on `id`.
- **`Clock`** — the domain port for "what time is it". **Never call `new Date()` in a handler or an aggregate**; inject `Clock` and call `now()`. `ClockModule` is `@Global()` and binds the real `SystemClock` everywhere except `NODE_ENV=test`, where it binds a `TunableClock` that the testing endpoints drive. `RegisterUserHandler`, `JwtTokenService` and `JwtAuthGuard` all depend on it, which is what makes token expiry testable.
- **`ProblemDetail`** / **`HttpExceptionFilter`** / **`ExceptionMapper`** — the RFC 9457 error pipeline; see *Exception Handling* below.
- **`AuthModule`** — global module providing `JwtModule` (configured from `JWT_SECRET`) and `JwtAuthGuard`; imported once in `AppModule`, available everywhere without re-importing.
- **`PrismaService`** / **`PrismaModule`** — the connection, via the Prisma driver adapter (`PrismaPg`), which connects lazily.

`src/configure-app.ts` is the single wiring point for the global prefix, the validation pipe, the
exception filter and Swagger. `main.ts` and the swagger generator both call it, which is how the
generated spec is guaranteed to describe the app that actually boots.

### Request Flow

```
Controller → CommandBus → CommandHandler → Aggregate.factory() → Repository.save()
                                                                      ↓
                                                              EventBus.publish(events)
```

### Exception Handling

All HTTP responses for errors use **RFC 9457 Problem Detail** (`application/problem+json`).

Chain: `HttpExceptionFilter` → iterates `ExceptionMapper[]` → first mapper that handles the exception wins.

To add a new domain exception:
1. Create exception class extending `ApplicationException` in `application/exceptions/`.
2. Add a case to the module's `ExceptionMapper` in `infrastructure/http/exception.mapper.ts`.
3. **If the module's mapper is itself new, register it** in the `ExceptionMappers` array at the top
   of `src/framework/infrastructure/http/exception.filter.ts`. That array is a hardcoded
   module-level `const`, not DI — the filter is constructed with `new` in `configure-app.ts` and can
   inject nothing.

Skipping step 3 fails quietly and confusingly: nothing throws, the mapper simply never matches, and
the response is a generic **500** from `ProblemDetail.forUnknownError()` instead of the status you
intended.

**Validation errors are the other half of this pipeline**, and they are the part the acceptance
suite leans on hardest. `configure-app.ts` installs a `ValidationPipe` with `whitelist`,
`forbidNonWhitelisted`, `forbidUnknownValues` and `transform`, plus a custom `exceptionFactory`
that reshapes class-validator's output into `{ field, message }[]`. `FrameworkExceptionMapper`
unpacks exactly that into a 400 `validation-error` problem carrying an `errors` array. Two
consequences: an **unknown property in a request body is a 400**, not something quietly ignored;
and changing the shape that factory produces breaks the mapper that reads it.

Problem `type` URIs are built by prefixing a slug with a base URL constant, so a mapper says
`user-already-exists` and the wire shows the full URI. That base is currently hardcoded in three
separate places — `problem-detail.ts`, the Swagger error schemas, and once more in a project
outside this one — with no shared constant between them. Changing it here alone breaks the other
copies silently. Extension members are spread at the **top level** of the response body, not nested
under a key.

### Architecture linting

The DDD + CQRS layer boundaries are enforced by **dependency-cruiser** (`.dependency-cruiser.cjs`).
Run `make lint-architecture`. Six rules: forbid cycles; keep the `domain` layer pure (no
`application`/`infrastructure`, no NestJS/Prisma); stop `application` reaching into
`infrastructure`; keep `framework` free of feature modules; keep modules from importing each
other; and **`no-own-package-barrel`** — a file under `src/framework/{domain,application,infrastructure}/`
must not import its own package's `index.ts`. That last one is the easiest to trip and the least
obvious: importing your own barrel creates a load-order cycle that crashes at runtime rather than
at build time. Import the sibling module directly.

One documented exception is whitelisted: `HttpExceptionFilter` composes the module exception
mappers (see `src/framework/CLAUDE.md`). Two mechanics worth knowing when a rule fires
unexpectedly: `no-circular` ignores cycles routed through an `index.ts`, and
`tsPreCompilationDeps` is on, so a type-only `import type` still counts as a dependency.
`*.spec.ts` files are excluded from the graph entirely.

### Testing

**Unit tests** — Jest, co-located `*.spec.ts` files next to the code they test. Run via
`make run-unit-tests` (not `make npm test` — prefer the targets, as above).

Be aware of what that suite currently covers: every spec file lives under `src/framework/`, and
`src/modules/` has **none** — the `identity` module is the reference implementation for structure,
not for test coverage. A new module's handlers and aggregates are the first place to add some.

**Testing-support endpoints** (`TestingModule`, `src/framework/infrastructure/http/testing/`) let an external test runner control the database, the clock and the email outbox between runs. The five writing ones return **204 No Content**:
- `POST /api/testing/migrations` — runs `prisma migrate deploy`.
- `POST /api/testing/truncate` — truncates all application tables **and clears the in-memory email outbox**. It is the "clean slate" endpoint, so it covers every kind of state a run leaves behind, not just the database.
- `POST /api/testing/clock` — pins the `TunableClock` to a given instant.
- `POST /api/testing/clock/advance` — moves it forward.
- `POST /api/testing/clock/reset` — returns it to `DEFAULT_INSTANT`.

The sixth is a read, and answers **200** with a JSON array:
- `GET /api/testing/emails?to=<address>` — `[{to, subject, body, sentAt}]` from `InMemoryEmailOutbox`, **newest first**. `to` is validated as an email, so a malformed one is a 400. The outbox is per-process, so it is also lost on restart.

`TestingModule` is imported into `AppModule` only when `NODE_ENV === 'test'`, so these endpoints exist
on the test stack alone — not in development, not in production. See *Two stacks* above.

### Prisma

Prisma 7, with a **multi-file schema**. There is no `prisma/schema.prisma`:

```
prisma/
├── schema/
│   ├── _config.prisma      # generator + datasource
│   └── identity.prisma     # one file per module
└── migrations/
```

`prisma.config.ts` points the CLI at the directory (`schema: 'prisma/schema'`). **A new module's
models go in a new `prisma/schema/<module>.prisma`** — one file per module, mirroring
`src/modules/`.

The `datasource` block has no `url`. It comes from `prisma.config.ts` for CLI work (migrations,
studio) and from the `PrismaPg` driver adapter at runtime, both reading `DATABASE_URL`, which
Compose assembles from the `POSTGRES_*` variables.

Two conventions in the schema itself: every field carries an explicit `@map` to a snake_case
column, and every model an `@@map` to a snake_case table — `User` is `app_user`, since `user` is
awkward in Postgres. And annotate every `DateTime` with `@db.Timestamptz(N)`; the Prisma default
is `timestamp without time zone`, which stores bare UTC that then reads back as a wrong local time.

### Path Aliases

- `@framework/*` → `src/framework/*`
- `@identity/*` → `src/modules/identity/*`

### Logging

Structured JSON logging via `nestjs-pino`. Sensitive fields (`authorization`, `password`, cookies) are redacted. Pretty-printed in development.

### API Conventions

- All routes are prefixed with `/api`.
- `GET /api/health` — public liveness probe (`HealthModule`, mounted in every environment). Returns
  `200 {"status":"ok"}`; it touches no dependencies, so it stays `200` even when the database is down.
- Auth routes use Bearer JWT in `Authorization` header.
- `@CurrentUser()` decorator extracts the authenticated user from the request.
- Swagger UI available at `/api-docs` in non-production environments.
