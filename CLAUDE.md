# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev        # Start with hot reload (port 3000)
npm run build            # Compile TypeScript
npm run lint             # ESLint + auto-fix
npm test                 # Jest unit tests (src/**/*.spec.ts)
npm run test:watch       # Jest in watch mode
npm run test:cov         # Jest with coverage
npm run test:bdd         # Cucumber BDD tests (loads .env.test)
npm run db:migrate       # Apply Prisma migrations
npm run db:generate-client  # Regenerate Prisma client
npm run swagger:generate # Build + export OpenAPI spec
```

Run a single Jest test file:
```bash
npx jest path/to/file.spec.ts
```

Run a single Cucumber scenario by tag:
```bash
npx cucumber-js --tags "@tag-name"
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

The `type` URI field (not `detail`) is the canonical identifier for problem types in BDD assertions.

### BDD Tests (`features/`)

- Feature files: `features/specs/<domain>/*.feature`
- Steps: `features/step_definitions/<domain>/*.steps.ts` + `features/step_definitions/common/http.steps.ts`
- `AppWorld` (`features/support/world.ts`) holds `app`, `client`, `response`, `accessToken`.
- `Before` hook bootstraps a fresh NestApp and truncates all DB tables (except `_prisma_migrations`) per scenario.
- Tests are **black-box HTTP only** — no direct service calls in steps.

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
