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
│   │   └── value-objects/      # Identity, Email
│   ├── application/            # Application-level exceptions
│   └── infrastructure/         # PrismaModule, PrismaService, HttpExceptionFilter
│
└── modules/
    └── identity/               # User registration and authentication
        ├── domain/             # User aggregate, repository interface, service interfaces
        ├── application/        # RegisterUserCommand, LoginCommand + handlers
        └── infrastructure/     # Controllers, DTOs, Prisma repository, JWT/bcrypt impls

prisma/
├── schema/                     # Modular Prisma schema files
└── migrations/                 # SQL migration history
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
  "type": "https://example.com/problems/user-already-exists",
  "title": "User Already Exists",
  "status": 409,
  "detail": "A user with this email is already registered.",
  "instance": "/api/auth/signup"
}
```

The `type` URI is the canonical identifier for a problem type — prefer asserting on `type` over `detail` in tests.

**Adding a new domain exception:**

1. Create an exception class extending `ApplicationException` in `application/exceptions/`.
2. Add a case to the module's `ExceptionMapper` in `infrastructure/http/exception.mapper.ts`.

`HttpExceptionFilter` iterates all registered `ExceptionMapper[]` instances; the first mapper that handles the exception wins.

---

## Logging

Structured JSON logging is provided by `nestjs-pino`. Sensitive fields (`authorization`, `password`, cookies) are redacted from all log output. Logs are pretty-printed in development and emitted as JSON in production.

---

## Getting Started

**Prerequisites:** Docker, Docker Compose, and `make`.

```bash
make up              # builds images and starts app + db (creates .env on first run)
make npm db:migrate  # apply database migrations (manual step)
```

The app runs at http://localhost:3000 with hot reload — edit files under `src/` and see changes live.
Swagger docs: http://localhost:3000/api-docs. Prisma Studio: `make npm db:studio` (http://localhost:5555).

Run `make help` to see all available commands, or `make npm <script>` to run any script from
the table below inside the container.

---

## Scripts

| Script | Description |
|---|---|
| `start:dev` | Start with hot reload |
| `build` | Compile TypeScript |
| `lint` | Lint and auto-fix |
| `test` | Run Jest unit tests |
| `db:migration:create` | Create a new migration |
| `db:migrate` | Apply pending migrations |
| `db:migration:status` | Show migration status |
| `db:studio` | Open Prisma Studio |
| `db:generate-client` | Regenerate Prisma client |
| `swagger:generate` | Build + export OpenAPI spec as JSON |
