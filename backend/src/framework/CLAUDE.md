# Framework (`src/framework/`)

Reusable base classes for DDD + CQRS. Import via path aliases:

- `@framework/domain` — entities, aggregates, value objects, repositories, exceptions
- `@framework/application` — application exception base
- `@framework/infrastructure` — Prisma repository, HTTP filter, JWT guard, Swagger helpers

---

## Domain Layer

### `ValueObject`
Base for all value objects. Equality is structural (deep JSON comparison of all properties).
Extend and validate invariants in the constructor; throw a `DomainException` on invalid input.

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

### `DomainException`
Abstract base for domain-layer exceptions. Extend for invariant violations.

### `EntityNotFound`
Extends `DomainException`.
- `EntityNotFound.withId(id: Identity)` — static factory; includes the identity in HTTP extension members.

---

## Application Layer

### `ApplicationException`
Abstract base for use-case exceptions (not domain invariants). Extend for business-rule failures surfaced at the application layer (e.g. duplicate email, invalid credentials).

---

## Infrastructure Layer

### `PrismaEntityRepository<T, PModel>` extends `EntityRepository<T>`
Concrete Prisma implementation. Subclasses must implement:
- `toDomain(record: PModel): T` — maps a Prisma record to the domain aggregate.
- `toPersistence(entity: T): PModel` — maps the aggregate back to a Prisma record.

After a successful `save`, the base class calls `entity.releaseEvents()` and publishes all events via `EventBus.publishAll()`.

Constructor takes `(delegate: ModelDelegate, eventBus: EventBus)` — pass `prisma.<model>` as delegate.

### `PrismaService`
Extends `PrismaClient`. Provided globally by `PrismaModule` — never instantiate directly.

### `ProblemDetail`
RFC 9457 problem detail builder.
- `ProblemDetail.forUnknownError()` — 500 fallback.
- `ProblemDetail.fromHttpException(ex)` — wraps a NestJS `HttpException`.
- Constructor: `(typeUri, title, status, detail?, instance?, extensionMembers?)`.
- `.asResponseBody()` — serialises to the JSON response shape.

### `ExceptionMapper` (interface)
Strategy for mapping exceptions to `ProblemDetail`:
```ts
canMap(exception: unknown): boolean
toProblemDetail(exception: unknown): ProblemDetail
```

### `HttpExceptionFilter`
Global `@Catch()` filter. Iterates a chain of `ExceptionMapper` instances (framework first, then module-specific). First mapper that returns `canMap() === true` wins. Falls back to `ProblemDetail.forUnknownError()`.
Sets `Content-Type: application/problem+json` on the response.

### `JwtAuthGuard`
Validates the `Authorization: Bearer <token>` header using `JwtService`. Injects `{ sub: userId }` on the request object. Throws `UnauthorizedException` on missing or invalid tokens.

### `AuthenticatedUser` + `@CurrentUser()` decorator
`AuthenticatedUser` holds `id: Identity`. The `@CurrentUser()` parameter decorator extracts `request.user.sub` and wraps it in an `AuthenticatedUser` instance.

### Swagger Helpers (`infrastructure/http/swagger/error-schemas.ts`)
Pre-built error schema objects for `@ApiResponse` decorators:
- `ValidationErrorSchema` — 400 validation errors
- `EntityNotFoundSchema` — 404 with entity ID
- `JwtUnauthorizedSchema` — 401 unauthorized
- `domainErrorSchema(typeUri, title, status, detail?, extensionMembers?)` — generic factory
