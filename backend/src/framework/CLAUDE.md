# Framework (`src/framework/`)

Reusable base classes for DDD + CQRS. Import via path aliases:

- `@framework/domain` — entities, aggregates, value objects, repositories, exceptions, the `Clock` port
- `@framework/application` — application exception base
- `@framework/infrastructure` — Prisma repository, HTTP filter, JWT guard, clock implementations, Swagger helpers

One rule the architecture lint enforces here and nowhere else: **a file under
`domain/`, `application/` or `infrastructure/` must not import its own package's `index.ts`.**
Import the sibling module by path. Going through your own barrel creates a load-order cycle that
survives the type-checker and crashes at runtime — `FrameworkExceptionMapper` is the case that
taught us, and `no-own-package-barrel` in `.dependency-cruiser.cjs` is what now catches it.

---

## Domain Layer

### `ValueObject`
Base for all value objects. Equality is structural (deep JSON comparison of all properties).

The convention both existing value objects follow: **a private constructor and a static factory
that validates**, so an instance cannot exist in an invalid state. `Email.fromString` normalises
then validates; `Identity.fromString` validates non-empty.

Note what they throw on invalid input: a plain `Error`, not a `DomainException`. That has a
consequence worth knowing before you copy the pattern into a code path reachable from a controller
— no `ExceptionMapper` matches a plain `Error`, so it falls through `HttpExceptionFilter` to
`ProblemDetail.forUnknownError()` and the client sees a **500, not a 400**. Value objects built
from already-validated DTO input are fine; one built straight from untrusted request data needs a
mapped exception instead.

### `Entity`
Base for domain entities. Equality is identity-based (compares `id` only).
Constructor requires an `Identity`.

### `AggregateRoot` extends `Entity`
Adds domain event management:
- `recordThat(event: DomainEvent)` — appends to internal event queue.
- `releaseEvents(): DomainEvent[]` — returns all queued events and clears the queue.

Call `recordThat` inside business methods (factory or mutation); the repository base calls `releaseEvents` on save.

### `DomainEvent`
Marker interface — implement it on any event class. No required fields.

### `Identity`
Core identifier value object wrapping a UUID string.
- `Identity.new()` — generates a new UUID.
- `Identity.fromString(id)` — creates from an existing string (validates non-empty).
- `.asString()` / `.toString()` — returns the raw UUID.

### `Email`
Email value object with validation and normalisation.
- `Email.fromString(email)` — trims whitespace, lowercases, validates format; throws on invalid.
- `.asString()` / `.toString()` — returns the normalised email.

### `EntityRepository<T extends AggregateRoot>` (abstract)
| Method | Behaviour |
|--------|-----------|
| `find(id: Identity)` | Returns `T \| null` |
| `get(id: Identity)` | Returns `T` or throws `EntityNotFound` |
| `save(entity: T)` | Persists and publishes domain events |

### `Clock` (`domain/service/clock.ts`)
The port for "what time is it": `abstract class Clock { abstract now(): Date }`.

**Never call `new Date()` in an aggregate, a handler or a service.** Inject `Clock` and call
`now()`. Time is a dependency like any other, and this is what lets a test pin it.

Implementations live in `infrastructure/clock/` and are wired by `ClockModule`, which is `@Global()`
and chooses on `NODE_ENV === 'test'`:

| | `SystemClock` | `TunableClock` |
|---|---|---|
| Bound when | every other environment | `NODE_ENV=test` |
| `now()` | the real time | a held instant, frozen until moved |
| Starts at | — | `DEFAULT_INSTANT` (`2026-01-01T00:00:00.000Z`) |

In test the module binds `TunableClock` as a provider and `Clock` with `useExisting`, so both
tokens resolve to the **same singleton**: consumers keep injecting `Clock` while the testing
endpoints inject the concrete `TunableClock` to call `set`, `advanceBy` and `reset` on it. A
`TunableClock` never advances on its own.

### `DomainException`
Abstract base for domain-layer exceptions — an empty `extends Error`, so it imposes no message or
type contract of its own. Extend for invariant violations.

### `EntityNotFound`
Extends `DomainException`.
- `EntityNotFound.withId(id: Identity)` — static factory. It stores the value as `identifier`, but
  `FrameworkExceptionMapper` emits it under the extension member key **`entityId`**; that is the
  name a client (or a test) sees on the wire.

---

## Application Layer

### `ApplicationException`
Abstract base for use-case exceptions (not domain invariants) — like `DomainException`, an empty
`extends Error`. Extend for business-rule failures surfaced at the application layer (e.g. duplicate email, invalid credentials).

### `EmailSender` / `EmailMessage` (`application/service/email-sender.ts`)
The port for "deliver this message", and the message itself (`recipient: Email`, `subject`, `body`).
Nothing here names a transport. See `InMemoryEmailOutbox` below for the only binding.

---

## Infrastructure Layer

### `PrismaEntityRepository<T, PModel>` extends `EntityRepository<T>`
Concrete Prisma implementation. Subclasses must implement:
- `toDomain(record: PModel): T` — maps a Prisma record to the domain aggregate.
- `toPersistence(entity: T): PModel` — maps the aggregate back to a Prisma record.

`save()` is an **upsert** keyed on `id`, so it covers both creating and updating an aggregate —
there is no separate `add`. After a successful save the base class calls `entity.releaseEvents()`
and publishes all events via `EventBus.publishAll()`.

Constructor takes `(delegate: ModelDelegate, eventBus: EventBus)` — pass `prisma.<model>` as
delegate. `ModelDelegate<PModel>` is a narrow structural type requiring only `findUnique` and
`upsert`, which is what keeps the base class from depending on generated Prisma types.

### `PrismaService`
Extends `PrismaClient`. Provided globally by `PrismaModule` — never instantiate directly.

### `InMemoryEmailOutbox` / `EmailModule` (`infrastructure/email/`)
The only `EmailSender` the app binds. **No email provider has been chosen**, so nothing is
delivered: `send()` appends a `SentEmail` (recipient, subject, body, `sentAt` from the injected
`Clock`) to an in-process array, and `sentTo(recipient)` reads them back **newest first**.

`EmailModule` is `@Global()` and uses the same `useExisting` trick as `ClockModule`: `EmailSender`
and `InMemoryEmailOutbox` resolve to one singleton, so application code injects the port while the
testing endpoints inject the concrete outbox to read it. **Choosing a real provider later is a
single binding change in that module** — that is the whole point of keeping the port.

`clear()` throws everything away, and `POST /testing/truncate` calls it alongside the table
truncation — that endpoint exists to hand a test runner a clean slate, and sent mail is state a run
leaves behind like any other. Being in memory, the outbox is per-process and lost on restart too.

Ordering is by **insertion**, not by `sentAt`: `sentTo` reverses the array rather than sorting on
the timestamp. That matters because under `NODE_ENV=test` the clock is pinned, so several messages
routinely share an identical `sentAt` and a sort would leave their order undefined.

### `ProblemDetail`
RFC 9457 problem detail builder.
- `ProblemDetail.forUnknownError()` — 500 fallback, with `about:blank` as its type.
- `ProblemDetail.fromHttpException(ex)` — wraps a NestJS `HttpException`.
- Constructor: `(typeUri, title, status, detail?, instance?, extensionMembers?)`.
- `.asResponseBody()` — serialises to the JSON response shape.

Two things about that serialisation. `typeUri` is a **slug, not a URL** — pass
`user-already-exists` and `asResponseBody()` prefixes `TYPE_BASE_URL`
(`https://my-api-doc.dev/problems`) to produce the wire value; `about:blank` is passed through
untouched. And `extensionMembers` are **spread at the top level** of the body, not nested under a
key, which is how `errors` and `entityId` end up as siblings of `title` and `status`.

That base URL is currently duplicated in `swagger/error-schemas.ts` and once more outside this
project, with no shared constant tying them together. Changing it in one place breaks the others
silently.

### `ExceptionMapper` (interface)
Strategy for mapping exceptions to `ProblemDetail`:
```ts
canMap(exception: unknown): boolean
toProblemDetail(exception: unknown): ProblemDetail
```

### `HttpExceptionFilter`
Global `@Catch()` filter. Iterates a chain of `ExceptionMapper` instances (framework first, then module-specific). First mapper that returns `canMap() === true` wins. Falls back to `ProblemDetail.forUnknownError()`.
Sets `Content-Type: application/problem+json` on the response.

**That chain is a hardcoded `const ExceptionMappers` array at the top of the file**, instantiated
with `new` at module load. It is not DI and not extensible from outside: the filter itself is
registered as `new HttpExceptionFilter()` in `configure-app.ts`, so it can inject nothing. Adding a
module means editing this framework file to add its mapper — which is exactly why it is the one
whitelisted exception in `.dependency-cruiser.cjs`, since it is the single place `framework` is
allowed to name a feature module. Forget it and the new module's exceptions become 500s.

### `JwtAuthGuard`
Validates the `Authorization: Bearer <token>` header. Injects `{ sub: userId }` on the request object. Throws `UnauthorizedException` on missing or invalid tokens.

It takes `(jwtService: JwtService, clock: Clock)` and verifies with a `clockTimestamp` taken from
the injected clock rather than from the machine. Under `NODE_ENV=test` that is the `TunableClock`,
so **token expiry follows test-controlled time** — a scenario can advance the clock past an hour
and watch a token stop working, without waiting or stubbing.

### `AuthModule` (`http/auth.module.ts`)
`@Global()` module, imported once in `AppModule`. Registers `JwtModule` asynchronously via `ConfigService.getOrThrow('JWT_SECRET')` (1h token expiry). Provides and exports `JwtAuthGuard` and `JwtModule` — available everywhere without re-importing.

### `HealthModule` / `HealthController` (`http/health/`)
Liveness probe consumed by the Docker Compose healthcheck for the `app` service:
- `GET /health` — returns `200 {"status":"ok"}`.

Routes here are written as the controller declares them. `configureApp` sets a global `api` prefix,
so the probe is actually reached at `/api/health` — which is what the healthcheck polls.

Deliberately dependency-free: it does not query the database, so it reports whether the HTTP server is
answering, not whether Postgres is reachable (the `db` service has its own `pg_isready` healthcheck).
`AppModule` imports it unconditionally — unlike `TestingModule`, it is mounted in production too.

### `TestingModule` / `TestingController` / `TestingService` (`http/testing/`)
Testing-support HTTP endpoints, consumed only by an external black-box test runner — never by
application code (reached at `/api/testing/*`, per the global prefix above). The five writing ones
answer **204 No Content**:
- `POST /testing/migrations` — runs `prisma migrate deploy` via `execFile`.
- `POST /testing/truncate` — `TestingService.truncateAll()`: queries `pg_tables` for the `public` schema (excluding `_prisma_migrations`), truncates them all with `RESTART IDENTITY CASCADE`, **then clears the `InMemoryEmailOutbox`**. The private `truncateAllTables()` is the SQL half; the public method is the clean slate.
- `POST /testing/clock` — pins the clock to the instant in the body (`SetClockDto`).
- `POST /testing/clock/advance` — moves it forward by a duration (`AdvanceClockDto`).
- `POST /testing/clock/reset` — returns it to `DEFAULT_INSTANT`.

The sixth reads, and answers **200** with `SentEmailView[]`:
- `GET /testing/emails?to=<address>` — what `InMemoryEmailOutbox` holds for that address,
  **newest first**, as `{to, subject, body, sentAt}` with `sentAt` an ISO string. `ListEmailsDto`
  puts `@IsEmail()` on `to`, so a malformed address is a 400 rather than a 500 out of
  `Email.fromString`.

`TestingService` takes `(prisma: PrismaService, clock: TunableClock, outbox: InMemoryEmailOutbox)` —
the concrete clock and the concrete outbox, not their ports, since only this module reads back what
the rest of the app is only allowed to write.

`AppModule` imports `TestingModule` only when `process.env.NODE_ENV === 'test'`. Note the condition is
an equality, not `!== 'production'`: these endpoints are absent from development as well as production,
and exist only on the dedicated test stack (`make test-up`, see `../../CLAUDE.md`). Nothing in a
development or production environment can reach an endpoint that truncates every table.

### `AuthenticatedUser` + `@CurrentUser()` decorator
`AuthenticatedUser` holds `id: Identity`. The `@CurrentUser()` parameter decorator extracts `request.user.sub` and wraps it in an `AuthenticatedUser` instance.

### Swagger Helpers (`infrastructure/http/swagger/error-schemas.ts`)
Pre-built error schema objects for `@ApiResponse` decorators:
- `ValidationErrorSchema` — 400 validation errors
- `EntityNotFoundSchema` — 404 with entity ID
- `JwtUnauthorizedSchema` — 401 unauthorized
- `domainErrorSchema(typeUri, title, status, detail?, extensionMembers?)` — generic factory
