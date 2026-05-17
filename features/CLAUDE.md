# BDD Tests (`features/`)

## Directory Layout

```
features/
├── specs/<domain>/        # Gherkin feature files
├── step_definitions/
│   ├── common/            # Shared HTTP + assertion steps
│   └── <domain>/          # Domain-specific steps
└── support/
    ├── world.ts           # AppWorld class
    └── hooks.ts           # BeforeAll / Before / After lifecycle
```

To add a new domain: create `specs/<domain>/` and `step_definitions/<domain>/` in parallel.

## AppWorld

`features/support/world.ts` — extends Cucumber's `World`:

| Field | Type | Purpose |
|-------|------|---------|
| `app` | `INestApplication` | The running NestJS app |
| `client` | `supertest.Agent` | HTTP client bound to the app |
| `response` | `supertest.Response` | Last HTTP response |
| `accessToken` | `string \| null` | JWT for authenticated requests |

## Lifecycle (hooks.ts)

- **BeforeAll** — runs `prisma migrate deploy` once.
- **Before each scenario** — spins up a fresh NestJS testing module, creates the supertest client, then **truncates all DB tables** (except `_prisma_migrations`) with `TRUNCATE … CASCADE`.
- **After each scenario** — closes the app.

Each scenario starts with a clean database; no shared state between scenarios.

## HTTP-Only Rule

Steps must never call services or repositories directly. All setup and assertions go through the HTTP API (`this.client.post(…)`, `this.client.get(…)`).

## Common Steps (`step_definitions/common/http.steps.ts`)

| Step | What it asserts |
|------|----------------|
| `the response status should be {int}` | HTTP status code |
| `the response body should be a valid problem detail` | `Content-Type: application/problem+json`; presence of `type`, `title`, `status` fields |
| `the response body should contain validation errors for:` (DataTable) | `type` matches validation-error URI; `errors` array contains the listed fields |

Use `the response body should be a valid problem detail` as the envelope check before any domain-specific type assertion.

## Domain Step Conventions

- One step per concern — extract envelope validation into the common step above; domain steps assert one business field (e.g., `the response body should contain an error indicating the email is taken`).
- Store the JWT on `this.accessToken` after a login step so subsequent steps can set `Authorization: Bearer ${this.accessToken}`.
- Assert `type` (always present per RFC 9457), not `detail` (optional).

## Running Tests

```bash
npm run test:bdd                          # all scenarios (loads .env.test)
npx cucumber-js --tags "@tag-name"        # single scenario by tag
```
