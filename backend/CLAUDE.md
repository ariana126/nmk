# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The app runs in Docker; the Makefile wraps Docker Compose. Prerequisites: Docker, Docker Compose, `make`.

```bash
make up                  # build (if needed) and start app + db, waiting until both are healthy
make down                # stop and remove containers
make logs                # tail logs from all containers
make sh                  # open a shell in the app container
make npm <script>        # run any package.json script inside the container
make run-unit-tests      # Jest unit tests (src/**/*.spec.ts), in a one-off container
make help                # list all available make targets
```

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
in memory and compares it to what is on disk; `make generate-swagger` is the fix. Both boot the app,
so the stack must be up — they are the only quality checks that need it. `lint`, `fix-lint`,
`format`, `fix-format` and `lint-architecture` are static analysis over `src/`: they run in a
throwaway container with no database, and the `fix-` ones still write to the working tree, since
the repo is bind-mounted into the container.

Make targets are verb-object and hyphenated (`fix-format`, `lint-architecture`); the
package.json scripts they wrap keep their own names (`format:fix`, `depcruise`). Prefer the
targets over `make npm <script>` — because `lint` and `format` are now real targets,
`make npm lint` runs the linter twice (once through the passthrough, once as a second goal).

Other scripts, via `make npm <script>`:
```bash
make npm start:dev           # (already running via `make up`) hot reload on port 3000
make npm test:cov            # Jest with coverage
make npm db:migrate          # apply Prisma migrations (manual step after `make up`)
make npm db:generate-client  # regenerate Prisma client
```

Run a single Jest test file (from a shell inside the container via `make sh`):
```bash
npx jest path/to/file.spec.ts
```

`make up` passes `--wait` to Docker Compose, so it only returns once both containers report healthy —
the `db` service via `pg_isready`, the `app` service via the `GET /api/health` liveness probe.

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
│   ├── commands/         # ICommandHandler implementations
│   ├── queries/          # IQueryHandler + ReadModel DTOs
│   └── exceptions/       # ApplicationException subclasses
└── infrastructure/
    ├── http/
    │   ├── controllers/  # NestJS controllers using CommandBus/QueryBus
    │   ├── dto/          # Input DTOs (class-validator decorators)
    │   └── exception.mapper.ts  # Domain → Problem Detail mapping
    └── persistence/
        ├── <name>.repository.ts  # Extends PrismaEntityRepository
        └── <name>.mapper.ts      # Domain ↔ Prisma model conversion
```

### Framework Abstractions (`src/framework/`)

- **`AggregateRoot`** — extends `Entity`; call `recordThat(event)` to emit domain events; repository base class calls `releaseEvents()` and publishes via EventBus on save.
- **`ValueObject`** — value equality; extend and validate in the constructor.
- **`Identity`** / **`Email`** — core value objects; use `Identity.new()` and `Email.fromString()`.
- **`EntityRepository<T>`** — abstract base: `find`, `get` (throws if missing), `save`.
- **`PrismaEntityRepository<Domain, Prisma>`** — concrete Prisma base; subclasses implement `toDomain()` and `toPersistence()`.
- **`AuthModule`** — global module providing `JwtModule` (configured from `JWT_SECRET`) and `JwtAuthGuard`; imported once in `AppModule`, available everywhere without re-importing.

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

### Architecture linting

The DDD + CQRS layer boundaries are enforced by **dependency-cruiser** (`.dependency-cruiser.cjs`).
Run `make lint-architecture`. The rules forbid cycles, keep the `domain` layer pure (no
`application`/`infrastructure`, no NestJS/Prisma), stop `application` reaching into
`infrastructure`, keep `framework` free of feature modules, and keep modules from importing each
other. One documented exception is whitelisted: `HttpExceptionFilter` composes the module
exception mappers (see `src/framework/CLAUDE.md`).

### Testing

**Unit tests** — Jest, co-located `*.spec.ts` files next to the code they test. Run via `make npm test`.

**Testing-support endpoints** (`TestingModule`, `src/framework/infrastructure/http/testing/`) let an external test runner apply migrations and reset database state between runs:
- `POST /api/testing/migrations` — runs `prisma migrate deploy`.
- `POST /api/testing/truncate` — truncates all application tables.

`TestingModule` is only imported into `AppModule` when `NODE_ENV !== 'production'` — it is never reachable in production.

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
