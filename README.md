# NMK

A starter template for building reliable, scalable, and maintainable backend applications fast — by delegating implementation to AI agents while keeping humans in the loop for validation and review.

---

## Philosophy

### 1. AI Implements, Humans Validate

The core workflow: AI agents handle implementation; humans own the validation gate. This separation keeps AI productivity high while ensuring quality through deliberate human review at each checkpoint.

### 2. Software Has Two Values

From *Clean Architecture* by Robert C. Martin:

> Software has two values: **functionality** and **structure**. What makes software *soft* — adaptable and changeable — is its structure, not its functionality.

Hardware is hard because you cannot change it cheaply. Software must remain soft. Both values must be continuously validated.

---

## The Validation Layer

The validation layer is the heart of this project. It ensures AI-generated code meets the bar on both dimensions above.

### Functional Validation — BDD

Behavioral tests treat the application as a **black box**. No implementation details are assumed. Tests interact only through exposed API contracts.

```gherkin
# Good — black box
Given a user signs up via POST /auth/signup
Then they should receive a JWT token

# Bad — white box (avoid)
Given a user record exists in the users table
```

This approach decouples tests from internals, making them resilient to refactors and safe to run against AI-generated implementations.

Feature specs live in `features/specs/`. Step definitions live in `features/step_definitions/`. World setup and lifecycle hooks live in `features/support/`.

### Structural Validation

Beyond working code, structure is checked for long-term maintainability:

| Category | What is validated |
|---|---|
| Architecture | DDD layers, Clean Architecture boundaries |
| Code style | TypeScript conventions, naming, formatting |
| OOP & patterns | SOLID principles, appropriate design patterns |
| Security | OWASP top 10, auth, input validation |
| Performance | Query efficiency, N+1 detection, response times |

---

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
| BDD | Cucumber |
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

features/
├── specs/                      # Gherkin feature files
├── step_definitions/           # Step implementations
└── support/                    # World class and lifecycle hooks

prisma/
├── schema/                     # Modular Prisma schema files
└── migrations/                 # SQL migration history
```

---

## Getting Started

**Prerequisites:** Node.js, PostgreSQL running locally.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env

# 3. Run database migrations
npm run db:migration:deploy

# 4. Start the dev server
npm run start:dev
```

---

## Scripts

| Script | Description |
|---|---|
| `start:dev` | Start with hot reload |
| `build` | Compile TypeScript |
| `lint` | Lint and auto-fix |
| `test` | Run Jest unit tests |
| `test:bdd` | Run Cucumber BDD tests |
| `db:migration:create` | Create a new migration |
| `db:migration:deploy` | Apply pending migrations |
| `db:migration:status` | Show migration status |
| `db:studio` | Open Prisma Studio |
| `db:generate-client` | Regenerate Prisma client |
