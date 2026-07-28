## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Architecture | DDD + CQRS |
| Auth | JWT + bcrypt |
| Unit testing | Jest |
| AI Agent | Claude Code |

---

## Project Structure

```
src/
├── framework/                  # Shared DDD building blocks
│   ├── domain/                 # Entity, AggregateRoot, ValueObject, DomainEvent
│   │   ├── value/              # Identity, Email
│   │   ├── exception/          # DomainException, EntityNotFound
│   │   └── service/            # EntityRepository
│   ├── application/            # Application-level exceptions
│   └── infrastructure/
│       ├── persistence/        # PrismaModule, PrismaService, PrismaEntityRepository
│       └── http/               # HttpExceptionFilter, ProblemDetail, AuthModule, JwtAuthGuard
│           ├── decorators/     # @CurrentUser, AuthenticatedUser
│           ├── health/         # GET /api/health liveness probe
│           ├── testing/        # migrate/truncate endpoints — mounted only at NODE_ENV=test
│           └── swagger/        # Reusable error schemas for @ApiResponse
│
└── modules/
    └── identity/               # User registration and authentication
        ├── domain/             # User aggregate, repository interface, service interfaces
        ├── application/        # RegisterUserCommand, LoginCommand + handlers
        └── infrastructure/     # Controllers, DTOs, Prisma repository, JWT/bcrypt impls

prisma/
├── schema/                     # Modular Prisma schema files (_config.prisma, identity.prisma)
└── migrations/                 # SQL migration history

docs/                           # Committed OpenAPI spec (openapi.json, openapi.yaml)
```

---

## Request Flow

```
Controller → CommandBus → CommandHandler → Aggregate.factory() → Repository.save()
                                                                      ↓
                                                              EventBus.publish(events)
```

Domain events are recorded on the aggregate via `recordThat(event)`, then released and published by the repository base class on every save.

---

## Exception Handling

All error responses follow the **RFC 9457 Problem Detail** standard (`Content-Type: application/problem+json`):

```json
{
  "type": "https://my-api-doc.dev/problems/user-already-exists",
  "title": "User Already Exists",
  "status": 409,
  "detail": "A user with this email is already registered.",
  "email": "someone@example.com"
}
```

A mapper supplies the trailing slug (`user-already-exists`); `ProblemDetail` prefixes the base URL.
`instance` is optional and no mapper currently sets one. Extension members — `email` above — are
spread at the top level of the body rather than nested.

The `type` URI is the canonical identifier for a problem type — prefer asserting on `type` over `detail` in tests.

**Adding a new domain exception:**

1. Create an exception class extending `ApplicationException` in `application/exceptions/`.
2. Add a case to the module's `ExceptionMapper` in `infrastructure/http/exception.mapper.ts`.
3. If that mapper is new, add it to the `ExceptionMappers` array in `exception.filter.ts` — it is a
   hardcoded list, not DI. Miss this and the exception falls through to a generic 500.

`HttpExceptionFilter` iterates all registered `ExceptionMapper[]` instances; the first mapper that handles the exception wins.

---

## Logging

Structured JSON logging is provided by `nestjs-pino`. Sensitive fields (`authorization`, `password`, cookies) are redacted from all log output. Logs are pretty-printed in development and emitted as JSON in production.

---

## Getting Started

**Prerequisites:** Docker, Docker Compose, and `make`.

```bash
make up              # build images and start both stacks (creates .env and .env.test on first run)
make npm db:migrate  # apply database migrations to the dev stack (manual step)
```

`make up` waits until every container is healthy before it returns, so the API is guaranteed to be
answering by the time you run the next command. Health is reported by `GET /api/health`, a public
liveness probe that returns `200 {"status":"ok"}`.

The app runs at http://localhost:3000 with hot reload — edit files under `src/` and see changes live.
Swagger docs: http://localhost:3000/api-docs. Prisma Studio: `make npm db:studio` (http://localhost:5555).

### Two stacks

`make up` starts the development stack **and** an isolated test stack — the same image with a
different env file, on ports 3001/5433 with `NODE_ENV=test` and its own database volume. Only the
test stack mounts the endpoints that migrate and truncate the database, so no test run can reach
development data. `make test-up`, `make test-down` and `make test-reset` target it on its own;
`make down` and `make reset` act on both. Full detail in `CLAUDE.md`.

### Checks

```bash
make lint                # ESLint check
make format              # Prettier check
make lint-architecture   # DDD + CQRS layer boundaries
make lint-swagger        # committed OpenAPI spec vs. the code
make run-unit-tests      # Jest unit tests
```

None of these needs a running stack — each starts a throwaway container, so they are safe to run
while `make up`'s stack is live. `make fix-lint`, `make fix-format` and `make generate-swagger` are
the writing counterparts. From the repo root, `make run-guardrails` runs every check CI enforces and
`make fix-violations` applies every automated fix.

Run `make help` to see all available commands, or `make npm <script>` to run any script from
the table below inside the container.

---

## Scripts

Every script below has a `make` target wrapping it — prefer the target (see the previous section).
The bare check scripts are read-only; the `:fix` variants write.

| Script | Description |
|---|---|
| `start:dev` | Start with hot reload |
| `start:prod` | Run the compiled build |
| `build` | Compile TypeScript |
| `lint` | ESLint check — reports, changes nothing |
| `lint:fix` | ESLint with auto-fix |
| `format` | Prettier check — reports, changes nothing |
| `format:fix` | Prettier auto-format |
| `depcruise` | Check the DDD + CQRS layer boundaries (dependency-cruiser) |
| `test` | Run Jest unit tests |
| `test:cov` | Jest with a coverage report |
| `db:migration:create` | Create a new migration |
| `db:migrate` | Apply pending migrations |
| `db:migration:status` | Show migration status |
| `db:validate-config` | Validate the Prisma schema |
| `db:format-config` | Format the Prisma schema files |
| `db:studio` | Open Prisma Studio |
| `db:generate-client` | Regenerate Prisma client |
| `swagger:generate` | Build + export OpenAPI spec as JSON and YAML |
| `swagger:check` | Verify the committed OpenAPI spec still matches the code |
