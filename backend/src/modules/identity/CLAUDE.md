# Identity Module (`src/modules/identity/`)

This is the **canonical reference implementation**. Follow its patterns when creating new modules.

---

## Domain

### `User` aggregate (`domain/user.aggregate.ts`)
- Extends `AggregateRoot` from `@framework/domain`.
- Properties: `id` (Identity), `email` (Email VO), `password` (hashed string), `firstName`, `lastName`, `registeredAt` (Date), `pendingPasswordReset` (`PasswordReset | null`).
- **`User.register(email, hashedPassword, firstName, lastName, registeredAt)`** — static factory; records a `UserRegistered` event. Note it takes **no `id`** — it calls `Identity.new()` itself — and that `registeredAt` is passed in rather than read from the system clock, so the caller supplies it from an injected `Clock`.
- **`requestPasswordReset(token, now)`** — replaces any earlier reset, so only the most recently issued link can be redeemed; records `PasswordResetRequested`.
- **`resetPassword(hashedPassword, now)`** — redeems the pending link *and* changes the password in one step, because consuming the link is what authorises the change; records `PasswordWasReset`. A redeemed reset is **kept, not cleared** — that is what lets a second use of the same link still resolve to its user and be told "already used" rather than "unknown". No pending reset at all throws a plain `Error`: the caller is expected to have found this user *by* its token, so it is a programming mistake, not a user-facing case.
- `getPassword()` — the one accessor on the aggregate, used by `LoginHandler` to compare hashes.
- `toPrimitives()` — returns a plain object for the mapper, including the four flattened `passwordReset*` keys.

### Password-reset value objects (`domain/value/`)
- **`PasswordResetToken`** — the stored, one-way **digest**. The secret itself travels by email and is never persisted; what the repository looks up and the aggregate holds is always the digest. `PasswordResetToken.fromDigest(digest)`.
- **`PasswordReset`** — `request(token, requestedAt)` / `restore(token, requestedAt, expiresAt, redeemedAt)` / `redeem(now)`. TTL is **one hour**, and `expiresAt` is *stored* rather than derived, so a link keeps the deadline it was issued with whatever the TTL becomes later. `redeem` checks already-used **before** expiry — a link that was used and then expired should say it was used.

### Events (`domain/events/`)
All implement `DomainEvent` and are published by the repository base class after save.

| Event | Carries | Recorded by |
|---|---|---|
| `UserRegistered` | `userId`, `email` | `User.register()` |
| `PasswordResetRequested` | `userId`, `email` | `User.requestPasswordReset()` |
| `PasswordWasReset` | `userId` | `User.resetPassword()` |

### Domain exceptions (`domain/exception/`)
Both extend **`DomainException`**, not `ApplicationException` — redeeming a link is a domain
invariant. `IdentityExceptionMapper.canMap` is widened to cover them.

| Exception | Factory | HTTP status |
|---|---|---|
| `PasswordResetExpired` | `PasswordResetExpired.at(expiredAt)` | 410 |
| `PasswordResetAlreadyUsed` | `PasswordResetAlreadyUsed.at(usedAt)` | 410 |

### Domain ports (abstract classes in `domain/service/`)
| Port | Contract |
|------|----------|
| `UserRepository` | Extends `EntityRepository<User>`; adds `findByEmail(email: Email)` and `findByPasswordResetToken(token: PasswordResetToken)`, both `Promise<User \| null>` |
| `PasswordHasher` | `hash(plain): Promise<string>`, `compare(plain, hashed): Promise<boolean>` |
| `TokenService` | `sign(payload: Record<string, unknown>): string` |
| `PasswordResetTokenGenerator` | `generateSecret(): string`, `digest(secret): PasswordResetToken`. `digest` **must be deterministic** — redeeming works by digesting the presented secret and finding the user holding the match. |
| `PasswordResetNotifier` | `notify(recipient: Email, secret: string): Promise<void>`. The one place the secret leaves the application. |

Abstract classes (not interfaces) so NestJS DI can use them as injection tokens.

---

## Application

### Commands (`application/commands/`)
Each command lives in its own subdirectory with a `<name>.command.ts` and `<name>.handler.ts`.

| Command | What the handler does |
|---------|-----------------------|
| `RegisterUserCommand` | Checks no existing user with that email; hashes password; calls `User.register()` with `this.clock.now()` as `registeredAt`; saves. Throws `UserAlreadyExists` if duplicate. |
| `LoginCommand` | Finds user by email (throws `InvalidCredentials` if missing); compares passwords; signs JWT. Returns `{ accessToken }`. |
| `RequestPasswordResetCommand` | Finds user by email (throws `UserNotFound` if missing); mints a secret, records its digest on the aggregate, saves, then notifies. Nothing is saved and nothing sent when the email is unknown. |
| `ResetPasswordCommand` | Digests the presented secret, finds the user holding it (throws `PasswordResetNotFound` if none), calls `resetPassword()` with the freshly hashed password, saves. **No session is created** — the user logs in afterwards. |

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
| `UserNotFound` | `UserNotFound.withEmail(email: Email)` | 404 |
| `PasswordResetNotFound` | `PasswordResetNotFound.forUnknownToken()` | 404 |

All extend `ApplicationException` from `@framework/application`.

`UserNotFound` on `POST /password-resets` **deliberately leaks whether an address is
registered**. That is what the business asked for; it is a decision, not an oversight, and the
usual "always answer 202" advice does not apply here. Change it only with the business.

---

## Infrastructure

### Persistence (`infrastructure/persistence/`)
**`PrismaUserRepository`** extends `PrismaEntityRepository<User, PrismaUser>`:
- Constructor passes `prisma.user` delegate and `EventBus` to the parent.
- Implements `toDomain(record)` and `toPersistence(entity)` via `UserMapper`.
- Adds `findByEmail(email)` and `findByPasswordResetToken(token)` — both `prisma.user.findUnique`, the latter over the `password_reset_token` unique index.

**`UserMapper`** — static helpers:
- `toDomain(prismaUser)` — reconstructs the aggregate using `Identity.fromString()` and `Email.fromString()`, and rebuilds the pending `PasswordReset` with `PasswordReset.restore(...)` when the token, requested-at and expires-at columns are all present. A **redeemed** reset is rebuilt too, not dropped.
- `toPersistence(user)` — reads `user.toPrimitives()` through a locally declared `UserPrimitives` interface and builds the `PrismaUser` record **field by field**.

`toPrimitives()` is still typed `: object` on the aggregate, so that one cast remains unchecked and
`UserPrimitives` is the only thing asserting the shape — get it wrong and it fails at runtime. What
the explicit record buys is the other direction: **a new Prisma column that the mapper does not
write is now a compile error**, where it used to be a silent runtime failure. Still change both
sides together.

The four reset columns are flattened onto `app_user` (`password_reset_token` unique and nullable,
plus `_requested_at`, `_expires_at`, `_redeemed_at`, all `@db.Timestamptz(3)`) because the reset is
a value the aggregate owns, not an entity of its own.

### Infrastructure services
| Class | Implements |
|-------|-----------|
| `BcryptPasswordHasher` | `PasswordHasher` (bcrypt, 10 salt rounds) |
| `JwtTokenService` | `TokenService` — delegates to NestJS `JwtService`, and injects `Clock` to stamp `iat` from it rather than from the machine clock |
| `Sha256PasswordResetTokenGenerator` | `PasswordResetTokenGenerator` — 32 random bytes as base64url for the secret, a plain SHA-256 hex digest for the token. Unsalted is correct **here and only here**: the input is 256 bits of entropy, not a guessable password, so the digest only has to be deterministic and one-way. Base64url keeps the secret URL-safe untouched. |
| `EmailPasswordResetNotifier` | `PasswordResetNotifier` — composes the link and hands an `EmailMessage` to the framework's `EmailSender`. |

**The reset link's shape is a contract**: exactly
`{APP_BASE_URL}/reset-password?token=<secret>`, built in one place
(`EmailPasswordResetNotifier.linkFor`) because something outside this project pattern-matches that
origin and path. `APP_BASE_URL` reaches the notifier as a **plain constructor string**, not a
`ConfigService` — `identity.module.ts` reads the environment once in a `useFactory`, which keeps
the adapter a unit that can be tested without DI.

Delivery itself is deliberately unsolved: **no email provider has been chosen**, so the only
`EmailSender` binding is the framework's in-memory outbox. See `src/framework/CLAUDE.md`.

### HTTP (`infrastructure/http/`)

Routes below are as the controllers declare them; `configureApp` adds the global `api` prefix, so
the real paths are `/api/auth/login`, `/api/users`, `/api/users/me` and `/api/password-resets…`.

| Controller | Route | Handler |
|------------|-------|---------|
| `AuthController` | `POST /auth/login` | `LoginCommand` |
| `UserController` | `POST /users` → **201 with an empty body** (no id, no `Location`) | `RegisterUserCommand` |
| `UserController` | `GET /users/me` (behind `JwtAuthGuard`) | `GetUserByIdQuery` |
| `PasswordResetController` | `POST /password-resets` `{email}` → **201** | `RequestPasswordResetCommand` |
| `PasswordResetController` | `PUT /password-resets/{token}/password` `{password}` → **204** | `ResetPasswordCommand` |

That `{token}` path segment is the **secret from the link**, not the stored digest — the handler
digests it before looking anything up.

Each controller lives in its own directory with a `dto/` beside it —
`controllers/user/user.controller.ts` and `controllers/user/dto/register-user.dto.ts`. The DTOs are
where the input contract actually lives, and one rule there is asserted from outside and easy to
change by accident: **`password` is `@MinLength(12)`**, in `RegisterUserDto` *and* in
`ResetPasswordDto` — a replacement password is held to the same standard as a new one, so the two
must move together.

**`IdentityExceptionMapper`** implements `ExceptionMapper`:

| Exception | Status | `type` | Extension members |
|---|---|---|---|
| `UserAlreadyExists` | 409 | `user-already-exists` | `email` |
| `InvalidCredentials` | 401 | `invalid-credentials` | — |
| `UserNotFound` | 404 | `user-not-found` | `email` |
| `PasswordResetNotFound` | 404 | `password-reset-not-found` | — |
| `PasswordResetExpired` | 410 | `password-reset-expired` | `expiredAt` |
| `PasswordResetAlreadyUsed` | 410 | `password-reset-already-used` | `usedAt` |

The last two are `DomainException` subclasses rather than `ApplicationException` ones, which is why
`canMap` names them explicitly.

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
    { provide: PasswordResetTokenGenerator, useClass: Sha256PasswordResetTokenGenerator },
    { provide: PasswordResetNotifier, inject: [EmailSender, ConfigService], useFactory: … },
  ],
  exports: [UserRepository],
})
```

DI binding pattern: `{ provide: AbstractDomainPort, useClass: ConcreteInfraClass }`.
`CqrsModule` must be imported for `CommandBus` and `QueryBus` to be available.
`PasswordResetNotifier` is the one `useFactory` — it exists solely to read `APP_BASE_URL` off
`ConfigService` (`getOrThrow`, so a missing value fails at boot) and pass it in as a plain string.
`EmailSender` and `ConfigService` both come from `@Global()` modules, so nothing extra is imported.
