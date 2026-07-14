# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The app runs in Docker; the Makefile wraps Docker Compose. Prerequisites: Docker, Docker Compose, `make`.

```bash
make up                  # build (if needed) and start app + db in the background
make down                # stop and remove containers
make logs                # tail logs from all containers
make sh                  # open a shell in the app container
make npm <script>        # run any package.json script inside the container
make help                # list all available make targets
```

Common scripts via `make npm <script>`:
```bash
make npm start:dev           # (already running via `make up`) hot reload on port 3000
make npm lint                # ESLint + auto-fix
make npm test                # Jest unit tests (src/**/*.spec.ts)
make npm test:cov            # Jest with coverage
make npm db:migrate          # apply Prisma migrations (manual step after `make up`)
make npm db:generate-client  # regenerate Prisma client
make npm swagger:generate    # build + export OpenAPI spec
```

Run a single Jest test file (from a shell inside the container via `make sh`):
```bash
npx jest path/to/file.spec.ts
```

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

### Testing

Two independent test layers:

- **Unit tests** — Jest, co-located `*.spec.ts` files next to the code they test. Run via `make npm test`.
- **Acceptance tests** — black-box BDD suite in the sibling `../acceptance-tests` project (Cucumber). `*.feature` specs live under `specs/<module>/`, step definitions under `step-definitions/`. Runs against a live backend + Postgres instance (its own Docker Compose stack), via `make run` / `npm test` inside `acceptance-tests/`.

The backend exposes testing-support endpoints (`TestingModule`, `src/framework/infrastructure/http/testing/`) used only by the acceptance suite's Cucumber hooks (`acceptance-tests/support/hooks.ts`) to apply migrations and reset DB state between scenarios:
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
- Auth routes use Bearer JWT in `Authorization` header.
- `@CurrentUser()` decorator extracts the authenticated user from the request.
- Swagger UI available at `/api-docs` in non-production environments.
