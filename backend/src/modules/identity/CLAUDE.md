# Identity Module (`src/modules/identity/`)

This is the **canonical reference implementation**. Follow its patterns when creating new modules.

---

## Domain

### `User` aggregate (`domain/user.aggregate.ts`)
- Extends `AggregateRoot` from `@framework/domain`.
- Properties: `id` (Identity), `email` (Email VO), `password` (hashed string), `firstName`, `lastName`, `registeredAt` (Date).
- **`User.register(email, hashedPassword, firstName, lastName, registeredAt)`** — static factory; records a `UserRegistered` event. Note it takes **no `id`** — it calls `Identity.new()` itself — and that `registeredAt` is passed in rather than read from the system clock, so the caller supplies it from an injected `Clock`.
- `getPassword()` — the one accessor on the aggregate, used by `LoginHandler` to compare hashes.
- `toPrimitives()` — returns a plain object for the mapper.

### `UserRegistered` event (`domain/events/user-registered.event.ts`)
Implements `DomainEvent`. Carries `userId: string` and `email: string`.
Recorded inside `User.register()`; published by the repository base class after save.

### Domain ports (abstract classes in `domain/service/`)
| Port | Contract |
|------|----------|
| `UserRepository` | Extends `EntityRepository<User>`; adds `findByEmail(email: Email): Promise<User \| null>` |
| `PasswordHasher` | `hash(plain): Promise<string>`, `compare(plain, hashed): Promise<boolean>` |
| `TokenService` | `sign(payload: Record<string, unknown>): string` |

Abstract classes (not interfaces) so NestJS DI can use them as injection tokens.

---

## Application

### Commands (`application/commands/`)
Each command lives in its own subdirectory with a `<name>.command.ts` and `<name>.handler.ts`.

| Command | What the handler does |
|---------|-----------------------|
| `RegisterUserCommand` | Checks no existing user with that email; hashes password; calls `User.register()` with `this.clock.now()` as `registeredAt`; saves. Throws `UserAlreadyExists` if duplicate. |
| `LoginCommand` | Finds user by email (throws `InvalidCredentials` if missing); compares passwords; signs JWT. Returns `{ accessToken }`. |

`RegisterUserHandler` injects three dependencies — `UserRepository`, `PasswordHasher` and
**`Clock`**. Any handler that needs the current time does the same; `new Date()` in a handler is
the thing this avoids.

### Queries (`application/queries/`)
| Query | Returns |
|-------|---------|
| `GetUserByIdQuery` | `UserReadModel` — plain DTO (`id`, `email`, `firstName`, `lastName`) |

Read the handler before copying it: it is **not yet** the read-side pattern the layout implies. It
resolves through the write-side `UserRepository`, loads the full aggregate, and casts
`toPrimitives()` to build the read model — with a `// TODO` in place saying a dedicated read-model
port belongs here instead. Follow the intent, not this implementation.

### Exceptions (`application/exceptions/`)
| Exception | Factory | HTTP status |
|-----------|---------|-------------|
| `UserAlreadyExists` | `UserAlreadyExists.withEmail(email: Email)` | 409 |
| `InvalidCredentials` | `InvalidCredentials.provided()` | 401 |

Both extend `ApplicationException` from `@framework/application`.

---

## Infrastructure

### Persistence (`infrastructure/persistence/`)
**`PrismaUserRepository`** extends `PrismaEntityRepository<User, PrismaUser>`:
- Constructor passes `prisma.user` delegate and `EventBus` to the parent.
- Implements `toDomain(record)` and `toPersistence(entity)` via `UserMapper`.
- Adds `findByEmail(email)` — queries `prisma.user.findUnique({ where: { email: … } })`.

**`UserMapper`** — static helpers:
- `toDomain(prismaUser)` — reconstructs aggregate using `Identity.fromString()` and `Email.fromString()`.
- `toPersistence(user)` — calls `user.toPrimitives()` and casts to `PrismaUser`.

That cast is unchecked, and `toPrimitives()` is typed `: object`, so the two sides are not actually
tied together. **Adding a column to the Prisma schema without adding it to `toPrimitives()`
compiles cleanly and fails at runtime.** Change both together.

### Infrastructure services
| Class | Implements |
|-------|-----------|
| `BcryptPasswordHasher` | `PasswordHasher` (bcrypt, 10 salt rounds) |
| `JwtTokenService` | `TokenService` — delegates to NestJS `JwtService`, and injects `Clock` to stamp `iat` from it rather than from the machine clock |

### HTTP (`infrastructure/http/`)

Routes below are as the controllers declare them; `configureApp` adds the global `api` prefix, so
the real paths are `/api/auth/login`, `/api/users` and `/api/users/me`.

| Controller | Route | Handler |
|------------|-------|---------|
| `AuthController` | `POST /auth/login` | `LoginCommand` |
| `UserController` | `POST /users` → **201 with an empty body** (no id, no `Location`) | `RegisterUserCommand` |
| `UserController` | `GET /users/me` (behind `JwtAuthGuard`) | `GetUserByIdQuery` |

Each controller lives in its own directory with a `dto/` beside it —
`controllers/user/user.controller.ts` and `controllers/user/dto/register-user.dto.ts`. The DTOs are
where the input contract actually lives, and one rule there is asserted from outside and easy to
change by accident: **`password` is `@MinLength(12)`**.

**`IdentityExceptionMapper`** implements `ExceptionMapper`:
- `UserAlreadyExists` → `ProblemDetail` 409, type `user-already-exists`, includes `email` in extension members.
- `InvalidCredentials` → `ProblemDetail` 401, type `invalid-credentials`.

Controllers use `CommandBus` / `QueryBus`. They construct value objects (`Email.fromString(dto.email)`) from raw DTO strings before building commands.

### Module (`infrastructure/identity.module.ts`)
```ts
@Module({
  imports: [CqrsModule],
  controllers: [...Controllers],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    { provide: UserRepository,    useClass: PrismaUserRepository },
    { provide: PasswordHasher,    useClass: BcryptPasswordHasher },
    { provide: TokenService,      useClass: JwtTokenService },
  ],
  exports: [UserRepository],
})
```

DI binding pattern: `{ provide: AbstractDomainPort, useClass: ConcreteInfraClass }`.
`CqrsModule` must be imported for `CommandBus` and `QueryBus` to be available.
