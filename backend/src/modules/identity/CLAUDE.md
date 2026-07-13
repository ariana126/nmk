# Identity Module (`src/modules/identity/`)

This is the **canonical reference implementation**. Follow its patterns when creating new modules.

---

## Domain

### `User` aggregate (`domain/user.aggregate.ts`)
- Extends `AggregateRoot` from `@framework/domain`.
- Properties: `id` (Identity), `email` (Email VO), `password` (hashed string), `firstName`, `lastName`.
- **`User.register(id, email, hashedPassword, firstName, lastName)`** — static factory; records a `UserRegistered` event.
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
| `RegisterUserCommand` | Checks no existing user with that email; hashes password; calls `User.register()`; saves. Throws `UserAlreadyExists` if duplicate. |
| `LoginCommand` | Finds user by email (throws `InvalidCredentials` if missing); compares passwords; signs JWT. Returns `{ accessToken }`. |

### Queries (`application/queries/`)
| Query | Returns |
|-------|---------|
| `GetUserByIdQuery` | `UserReadModel` — plain DTO (`id`, `email`, `firstName`, `lastName`), no domain types |

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

### Infrastructure services
| Class | Implements |
|-------|-----------|
| `BcryptPasswordHasher` | `PasswordHasher` (bcrypt, 10 salt rounds) |
| `JwtTokenService` | `TokenService` (delegates to NestJS `JwtService`) |

### HTTP (`infrastructure/http/`)
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
