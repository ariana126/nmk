# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Black-box BDD acceptance suite (Cucumber + Serenity/JS + TypeScript) for the sibling `../backend` project, written with the **Screenplay Pattern**.

The suite only ever talks to the backend over HTTP. No importing backend code, no direct database access — preconditions that can't be set up through the API don't get set up. It runs against a live backend + Postgres, so that stack must already be running (`../backend`, via its own `make up`).

## Commands

Runs in Docker via the Makefile. Prerequisites: Docker, Docker Compose, `make`.

```bash
make up                  # build (if needed) and start this container in the background
make down                # stop and remove the container
make sh                  # open a shell in the container
make run                 # run the full acceptance suite
make render-living-documentation   # render the living documentation from the last run
make npm <script>        # run any package.json script inside the container
make help                # list all available make targets
```

Code-quality checks. The bare targets are read-only; the `fix-` ones write:

```bash
make lint                # ESLint check (read-only, no changes)
make fix-lint            # ESLint + auto-fix
make format              # Prettier check (read-only, no changes)
make fix-format          # Prettier auto-format
```

These need nothing running — each starts a throwaway container (`docker compose run --rm`). The
`fix-` ones still write to the working tree, since the repo is bind-mounted into the container.

Make targets are verb-object and hyphenated (`fix-format`); the package.json scripts they
wrap keep the colon (`format:fix`). Prefer the targets over `make npm <script>` — because
`lint` and `format` are now real targets, `make npm lint` runs the linter twice (once
through the passthrough, once as a second goal).

From a shell inside the container (`make sh`):

```bash
npm test                                             # cucumber-js --tags 'not @wip'
npx cucumber-js specs/registration/sign-up.feature   # one feature file
npx cucumber-js specs/registration/sign-up.feature:20  # one scenario, by line number
npx cucumber-js --tags '@wip'                        # only @wip scenarios
npx tsc --noEmit                                     # typecheck
```

**`@wip`** marks scenarios written ahead of the backend. `npm test` excludes them. No scenario carries the tag today — the suite is fully green against the current backend, and it should stay that way (see *Assertion conventions*).

## Architecture

```
specs/<feature-area>/*.feature          # Gherkin. Organised by feature area, not by backend module
step-definitions/<feature-area>/*.steps.ts   # Thin: each step just delegates to a task
screenplay/
├── common/                             # Reusable across feature areas
│   ├── notes.ts                        # AccountNotes; TheDetailsTheySignedUpWith, TheirAccessToken
│   └── problem-detail.ts               # EnsureProblemDetail, EnsureValidationErrorFor, FieldsThatFailedValidation
├── registration/                       # SignUp, EnsureSignedUp, TheOmittedSignUpField, signUpDetailsOf
├── authentication/                     # LogIn, EnsureLoggedIn, EnsureNotLoggedIn, EnsureCredentialsRejected
└── profile/                            # ViewTheirProfile, TheProfile
support/
├── actors.ts                           # Cast: assigns abilities to every actor
├── config.ts                           # apiBaseUrl (trailing-slash normalised — see Gotchas)
├── parameter-types.ts                  # Cucumber parameter types: {actor} {actorName} {pronoun} {field}
└── hooks.ts                            # BeforeAll / Before: Serenity config, DB reset, cast
cucumber.cjs                            # loads support/ + step-definitions/ via ts-node
```

### Screenplay vocabulary, as implemented here

- **Actors** are the people named in the feature file (Ariana, Fateme). They are created by `Actors` (`support/actors.ts`), Serenity's `Cast`.
- **Abilities** are what an actor *can do*. Every actor gets two: `CallAnApi` (from `@serenity-js/rest`) and `TakeNotes`. **Each actor gets their own notepad** (`TakeNotes.usingAnEmptyNotepad()`), so what Ariana signed up with can't leak into what Fateme signed up with.
- **Tasks** are what an actor *does*, in business language: `SignUp`, `LogIn`, `ViewTheirProfile`. Assertions are tasks too, by convention named `Ensure*` — `EnsureLoggedIn`, `EnsureRejectedAsDuplicateEmail`.
- **Questions** are what an actor *knows*: `TheProfile`, `TheDetailsTheySignedUpWith`, `FieldsThatFailedValidation`.

Step definitions stay thin — they translate a Gherkin line into `actor.attemptsTo(...)` and nothing more. Logic belongs in tasks. Anything reusable across feature areas goes in `screenplay/common/`.

### Test data

`signUpDetailsOf(actorName)` (`screenplay/registration/sign-up-details.ts`) derives every field from the actor's name — `Ariana` → `ariana@example.com`, firstName `Ariana`, and so on. That is why the feature file names *people* rather than credentials: the details are an implementation detail of the task layer, and one actor can work out another's email without being told it.

**Passwords are deliberately per-actor.** If every actor shared one password, "Fateme logs in with Ariana's email and Fateme's password" would accidentally *be* Ariana's real credentials, and the scenario asserting that login fails would pass for the wrong reason.

### Test isolation

`support/hooks.ts`:

- **`BeforeAll`** — `configure({ crew })` (Serenity reporters, once for the whole suite) and `POST /api/testing/migrations`.
- **`Before`** — `POST /api/testing/truncate`, then `engage(new Actors(apiBaseUrl))`. Engaging a new cast per scenario gives fresh actors with fresh, empty notepads.

Both testing endpoints are exposed by the backend only when `NODE_ENV !== 'production'`.

### Assertion conventions

**One reusable envelope check, then one distinguishing fact.** `EnsureProblemDetail(status, slug)` (`screenplay/common/problem-detail.ts`) asserts the whole RFC 9457 envelope — `Content-Type: application/problem+json`, `type`, `title`, `status`. Domain-specific tasks build on it and add only what makes them different.

**Assert `type`, not `detail`.** `type` is always present and is the diagnostic field; `detail` is optional per RFC 9457.

**Assert the API as it is built, not as you wish it were.** The backend reports weak password, invalid email and missing data as the *same* `400` problem type (`validation-error`), distinguished only by which field appears in the `errors[]` array — hence `EnsureValidationErrorFor(field)`. Do not assert problem types the backend does not emit; that turns a green suite into a parked `@wip` one. Only duplicate email has a dedicated type (`409 user-already-exists`).

### Living documentation

Two phases:

1. `make run` — the `@serenity-js/serenity-bdd` crew member writes one raw JSON file per scenario into `target/site/serenity/`.
2. `make render-living-documentation` — shells out to the Serenity BDD **Java** CLI to aggregate those into a browsable HTML site at `target/site/serenity/index.html`. This is why the Dockerfile installs `default-jre-headless`. It renders whatever the last run produced; it does not run any tests.

`target/` is bind-mounted, so the living documentation opens straight from the host. Artifacts **accumulate** across runs — if the counts look wrong, `rm -rf target/` and re-run.

The target is named for what it produces, not for the tool that produces it — the npm script it wraps keeps its own name (`npm run report`), the same way `lint-architecture` wraps `npm run depcruise` in the backend.

## Gotchas

**Resource URIs must be relative, with no leading slash.** Serenity's `CallAnApi` resolves them with `new URL(uri, apiBaseUrl)` — *not* axios's `combineURLs`. `new URL('/users', 'http://host/api')` discards the `/api` segment and yields `http://host/users`, so every request 404s. `support/config.ts` guarantees the base URL ends in a slash; always write `PostRequest.to('users')`, never `PostRequest.to('/users')`.

**`actorCalled()` moves the spotlight.** Steps with no explicit subject (`Then the sign-up should be rejected...`) resolve their actor via `actorInTheSpotlight()`, which is whoever was named last. That is what the `{actorName}` parameter type is for: it yields a bare name string *without* summoning the actor. In `Fateme signs up with Ariana's email`, using `{actor}` for both names would leave **Ariana** in the spotlight, and the next `Then` would read her empty `LastResponse` instead of Fateme's.

The parameter types (`support/parameter-types.ts`):

| Type | Matches | Resolves to |
|------|---------|-------------|
| `{actor}` | `Ariana` | `actorCalled(name)` — creates the actor, takes the spotlight |
| `{actorName}` | `Ariana` | the plain string — no actor, no spotlight change |
| `{pronoun}` | `he`, `she`, `they` | `actorInTheSpotlight()` |
| `{field}` | `email`, `password`, `first name`, `last name` | the payload key (`firstName`, `lastName`) |

## Environment

`.env` (copied from `.env.example` by `make setup`, which `make up` runs for you):

- `API_BASE_URL` — the backend's API base, e.g. `http://localhost:3000/api`. The only variable.
