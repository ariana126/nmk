# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Black-box BDD acceptance suite (Cucumber + Serenity/JS + TypeScript) for the sibling `../backend`
and `../frontend` projects, written with the **Screenplay Pattern**.

**Skills.** `handbook:screenplay-guideline` is the authority on this suite's structure and anti-patterns (with `handbook:test-guideline` for black-box test design) — invoke it before writing automation.

The suite reaches the system two ways and no others: **HTTP to the backend**, and **a browser
pointed at the frontend**. No importing code from either project, no direct database access —
preconditions that can't be set up through one of those two doors don't get set up.

It runs against both projects' **test stacks** — separate Compose projects with their own
databases, so a run can never touch anything a developer is working in:

| Stack               | Compose project     | Port     |                                              |
| ------------------- | ------------------- | -------- | -------------------------------------------- |
| backend **test**    | `nmk-backend-test`  | **3001** | `NODE_ENV=test`, own database                |
| frontend **test**   | `nmk-frontend-test` | **4201** | proxies `/api` to the backend test stack      |

Not the dev stacks on 3000/4200. The testing endpoints this suite depends on
(`POST /api/testing/migrations` and `/truncate`) mount only at `NODE_ENV === 'test'`, so they simply
don't exist on 3000 — and a run can never truncate dev data. The frontend has no such switch; what
keeps it honest is `API_PROXY_TARGET`, which points 4201 at 3001 and 4200 at 3000.

Start them with `make -C ../backend test-up` and `make -C ../frontend test-up`, or let the root
`make run-acceptance-tests` do the whole sequence: both test stacks up, this container up, suite run.

## Which door a step goes through

The suite is **blended** (BDD in Action, ch15): the browser where the browser is the point, HTTP
everywhere else. Two of the seventeen examples drive the UI. That ratio is deliberate, not a
staging post — ch10 puts UI tests at "a small minority" of an acceptance suite.

| Scenario                     | Door                       | Why                                                                                                       |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Successful sign-up           | **UI**                     | ch10 reason 1: the key user journey, and the only one this suite has                                       |
| Already registered email     | `Given` **API**, rest **UI** | ch10 reason 3: screen-specific logic — a `409` is only worth something if the visitor is *told*, beside the offending field |
| Weak password (×6)           | **API**                    | ch10: proving a password rule through a form "would be wasteful"                                            |
| Invalid email (×5)           | **API**                    | ch10's canonical waste case                                                                                 |
| Missing data (×4)            | **API**                    | The form never submits an empty required field, so a UI version would document a *different* rule           |

**Grammatical voice is the signal.** `Given Ariana already has an account` is passive — we care only
*that* it is true, so it takes the API. `When he signs up` is active — we are demonstrating *how*,
so it drives the browser. Cucumber matches the two voices with different expressions, so the split
happens at the step-definition level with nothing to configure.

**The feature file knows nothing about any of this**, and that is the property to protect. Every
step text already maps to exactly one door: `should be able to login` appears only in the journey,
`should not be able to login` only in the outlines, `should not be able to login with X's email`
only in the duplicate-email scenario. There are no `@ui`/`@api` tags and no Cucumber profiles —
adding them would put an automation concern into a document written for the business.

**What this suite deliberately no longer asserts.** The RFC 9457 envelopes for
`409 user-already-exists` and `401 invalid-credentials` are gone, because the scenarios that used to
check them now watch the screen instead. Per ch13 §13.6, the shape of an error response is an
API-design detail and belongs to the backend's own tests. `EnsureProblemDetail` remains, and is
still the right tool for the three validation outlines.

## Commands

Runs in Docker via the Makefile. Prerequisites: Docker, Docker Compose, `make`, and **both test
stacks running** — `make run` drives a browser at the frontend on 4201, so a suite run against the
backend alone now fails rather than merely covering less. The root `make run-acceptance-tests`
starts both in the right order.

```bash
make up                  # build (if needed) and start this container in the background
make down                # stop and remove the container
make sh                  # open a shell in the container
make run                 # run the full acceptance suite
make render-living-documentation   # render the living documentation from the last run
make open-living-documentation     # render it, then open it in the browser
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
screenplay/                             # DOMAIN layer: what an actor does, in business language
├── common/                             # Reusable across feature areas
│   ├── clock.ts                        # FreezeTimeAt, LetTimePass (backend testing endpoints)
│   ├── notes.ts                        # AccountNotes; TheDetailsTheySignedUpWith
│   └── problem-detail.ts               # EnsureProblemDetail, EnsureValidationErrorFor, FieldsThatFailedValidation, problemTypeFor
├── ui/                                 # INTEGRATION layer: Lean Page Objects. Locate and report only
│   ├── form.ts                         # Form.inputFor/errorFor/buttonCalled/errorSummary — by label, via the query language
│   ├── profile-record.ts               # ProfileRecord.valueOf('Name' | 'Email address')
│   └── site-header.ts                  # SiteHeader.logOutButton/profileLink/logInLink/createAccountLink
├── registration/
│   ├── sign-up.ts                      # SignUp.using | .viaApiUsing, EnsureSignedUp, TheOmittedSignUpField, EnsureRejectedAsDuplicateEmail
│   └── sign-up-details.ts              # signUpDetailsOf, signUpDetailsWithout, requiredSignUpFields
├── authentication/                     # LogIn.using | .viaApiUsing, LogOut, EnsureLoggedIn, EnsureNotLoggedIn, EnsureCredentialsRejected, TheirOwnCredentials
└── profile/                            # ViewTheirProfile, EnsureProfileMatchesSignUpDetails
support/
├── actors.ts                           # Cast: assigns abilities to every actor
├── config.ts                           # apiBaseUrl (trailing-slash normalised — see Gotchas), appBaseUrl
├── parameter-types.ts                  # Cucumber parameter types: {actor} {actorName} {pronoun} {field}
└── hooks.ts                            # BeforeAll / Before / After / AfterAll: Serenity config, browser, DB reset, cast
cucumber.cjs                            # loads support/ + step-definitions/ via ts-node
```

The three layers of `handbook:screenplay-guideline` map onto that tree: `specs/` is the
**Specification** layer, `screenplay/` minus `ui/` is the **Domain** layer, and `screenplay/ui/`
plus `support/` is the **Integration** layer. A layer depends only on itself or the one directly
below. In particular a step definition never touches `screenplay/ui/` — if you find yourself
importing `Form` into a `.steps.ts` file, the task you actually wanted doesn't exist yet.

### Lean Page Objects

`screenplay/ui/` **locates elements and reports what they say. Nothing else** — no assertions, no
tasks, no driver. Behaviour lives in the tasks that use them.

Elements are found by what a person would read: the `<label>` above an input, the `<dt>` beside a
value, a button's text. The frontend has **no `data-test` attributes** and doesn't need any — the
accessibility gate already fails the build if an input loses its `<label for>`, so the label is a
contract that something else keeps honest. That is why `Form.inputFor('Email address')` is the
idiom here and `By.css('#email')` is not.

### Screenplay vocabulary, as implemented here

- **Actors** are the people named in the feature file (Ariana, Fateme). They are created by `Actors` (`support/actors.ts`), Serenity's `Cast`.
- **Abilities** are what an actor *can do*. Every actor gets three: `CallAnApi` (from
  `@serenity-js/rest`), `BrowseTheWebWithPlaywright` (from `@serenity-js/playwright`) and
  `TakeNotes`. Every actor can therefore use either door, and the *task* decides which — that is
  what makes blended testing possible. **Each actor gets their own notepad and their own browser
  context**, so neither what Ariana signed up with nor the session she left behind can leak into
  Fateme's scenario.
- **Tasks** are what an actor *does*, in business language: `SignUp`, `LogIn`, `ViewTheirProfile`. Assertions are tasks too, by convention named `Ensure*` — `EnsureLoggedIn`, `EnsureRejectedAsDuplicateEmail`.
- **Questions** are what an actor *knows*: `TheDetailsTheySignedUpWith`, `FieldsThatFailedValidation`.

**Name a task for its goal, put the route in the method name.** Where a goal is reachable both
ways, the two live on one class — `SignUp.using` drives the form, `SignUp.viaApiUsing` posts the
payload; `LogIn.using` / `LogIn.viaApiUsing` likewise. That is what lets a step swap one for the
other without the feature file noticing. Don't name a task `SignUpViaTheForm`; the goal is signing
up, and the form is how.

Step definitions stay thin — they translate a Gherkin line into `actor.attemptsTo(...)` and nothing more. Logic belongs in tasks. Anything reusable across feature areas goes in `screenplay/common/`.

### Test data

`signUpDetailsOf(actorName)` (`screenplay/registration/sign-up-details.ts`) derives every field from the actor's name — `Ariana` → `ariana@example.com`, firstName `Ariana`, and so on. That is why the feature file names *people* rather than credentials: the details are an implementation detail of the task layer, and one actor can work out another's email without being told it.

**Passwords are deliberately per-actor.** If every actor shared one password, "Fateme logs in with Ariana's email and Fateme's password" would accidentally *be* Ariana's real credentials, and the scenario asserting that login fails would pass for the wrong reason.

### Test isolation

`support/hooks.ts`:

- **`BeforeAll`** — `configure({ crew })` (Serenity reporters, once for the whole suite), launch
  one Chromium, and `POST /api/testing/migrations`.
- **`Before`** — `POST /api/testing/truncate`, then `POST /api/testing/clock/reset` so every
  scenario starts from the same frozen instant and scenario order never matters, then
  `engage(new Actors(...))`. Engaging a new cast per scenario gives fresh actors with fresh, empty
  notepads **and fresh browser contexts**.
- **`After`** — `serenity.waitForNextCue()`, so a failure's screenshot finishes being written
  before Cucumber tears the scenario down.
- **`AfterAll`** — close the browser.

The browser context matters as much as the truncation. The frontend keeps its access token in
`localStorage`, which a shared context would carry from one scenario into the next; a truncated
database plus a stale token is a confusing failure. One browser per run, one context per actor.

Both testing endpoints are exposed by the backend only when `NODE_ENV === 'test'` — which is why this
suite must be pointed at the test stack, and why pointing it at the dev stack fails in `BeforeAll`
with a 404 rather than quietly wiping a development database.

### Assertion conventions

**One reusable envelope check, then one distinguishing fact.** `EnsureProblemDetail(status, slug)` (`screenplay/common/problem-detail.ts`) asserts the whole RFC 9457 envelope — `Content-Type: application/problem+json`, `type`, `title`, `status`. Domain-specific tasks build on it and add only what makes them different.

**Assert `type`, not `detail`.** `type` is always present and is the diagnostic field; `detail` is optional per RFC 9457.

**Assert the API as it is built, not as you wish it were.** The backend reports weak password, invalid email and missing data as the *same* `400` problem type (`validation-error`), distinguished only by which field appears in the `errors[]` array — hence `EnsureValidationErrorFor(field)`. Do not assert problem types the backend does not emit; that turns a green suite into a parked `@wip` one. Only duplicate email has a dedicated type (`409 user-already-exists`).

**Through the UI, assert what the visitor sees.** The same discipline, one door over: a UI step
asserts the rendered message, the page it stayed on, whether the header offers "Log out". It never
reaches behind the page for a status code or a token — those aren't things a visitor can observe,
and a test that checks them isn't testing the interface it claims to. `EnsureProfileMatchesSignUpDetails`
deliberately makes no claim about the account's id, because the profile page doesn't show one.

### Waiting, and where it belongs

**Every step that reaches into freshly rendered markup must wait for it first.** Angular bootstraps
the shell and lazy-loads each route *after* the browser's load event, so a `Click` or `Enter`
issued straight after a navigation can find nothing and fail on the spot with a
`ListItemNotFoundError`. `Wait.until` is what survives that — it treats an empty match as "not yet"
and polls (`@serenity-js/core`'s `WaitUntil` ignores `ListItemNotFoundError` explicitly, on the
grounds that "lists might get populated later").

The wait belongs in the **locate** task, not in the task that follows it: `LocateTheSignUpForm`
ends by waiting for a field to be visible, so `FillInTheSignUpForm` can simply type. This is not
belt-and-braces — the suite flaked exactly here before those waits existed, and only when the
frontend container was cold enough that Vite still had to compile the identity chunk.

### Living documentation

Two phases:

1. `make run` — the `@serenity-js/serenity-bdd` crew member writes one raw JSON file per scenario
   into `target/site/serenity/`, and `Photographer.whoWill(TakePhotosOfFailures)` drops a PNG
   beside it whenever a UI step fails. Failures only: a photo per step would swamp the report, and
   a failed UI step can name the element it wanted but not show you the page it was looking at.
2. `make render-living-documentation` — shells out to the Serenity BDD **Java** CLI to aggregate those into a browsable HTML site at `target/site/serenity/index.html`. This is why the Dockerfile installs `default-jre-headless`. It renders whatever the last run produced; it does not run any tests.

`target/` is bind-mounted, so the living documentation opens straight from the host. `make open-living-documentation` does phase 2 and then opens `index.html` in the default browser — the one target that runs on the host rather than in a container, because a browser cannot be launched from inside one. Like `render-living-documentation`, it needs the container up.

Artifacts **accumulate** across runs — if the counts look wrong, `rm -rf target/` and re-run.

The target is named for what it produces, not for the tool that produces it — the npm script it wraps keeps its own name (`npm run report`), the same way `lint-architecture` wraps `npm run depcruise` in the backend.

## Gotchas

**Resource URIs must be relative, with no leading slash.** Serenity's `CallAnApi` resolves them with `new URL(uri, apiBaseUrl)` — *not* axios's `combineURLs`. `new URL('/users', 'http://host/api')` discards the `/api` segment and yields `http://host/users`, so every request 404s. `support/config.ts` guarantees the base URL ends in a slash; always write `PostRequest.to('users')`, never `PostRequest.to('/users')`.

**`localhost` works because the container shares the host's network.** `docker-compose.yml` sets
`network_mode: host`, so `http://localhost:3001` and `http://localhost:4201` inside the container
reach the ports the backend and frontend test stacks published on the host. There is no shared
Docker network between the three projects, and no service-name DNS — `http://app:3001` would not
resolve. `localhost` is also the only host that works for the browser: Vite's DNS-rebinding defence
403s any `Host` it doesn't recognise, and Chromium force-upgrades `.app` to HTTPS because it is an
HSTS-preloaded TLD. Both traps are documented in `../frontend/CLAUDE.md`.

**The three UI facts that will bite you.** All three come from how the frontend renders forms, and
none are guessable from the markup alone:

1. **The form-level banner is always in the DOM and empty** when there is nothing to report
   (`.alert:empty { display: none }` hides it). Its *presence* proves nothing — ask whether it is
   visible, or what it says. `Form.errorSummary()` exists so there is one place to get this wrong.
2. **A field error renders only once the field is `touched()`.** Submitting touches everything, so
   assert after a submit, never before.
3. **A server error clears the moment its field is edited.** Assert it before typing anything else.

**Chromium lives in this image.** The Dockerfile installs it with
`npx playwright install --with-deps chromium`, which fetches whatever the installed `playwright`
pins — so upgrading Playwright is an ordinary dependency bump with no image tag to keep in step.
If the build dies with `403 ... this service is not available in your location`, Playwright's CDN is
geo-blocked where you are; set `PLAYWRIGHT_DOWNLOAD_HOST` in `.env` to a mirror. Same arrangement,
and the same reasoning, as `../frontend/Dockerfile.a11y`.

**After a dependency change, the long-lived container needs `--renew-anon-volumes`.** `node_modules`
is an anonymous volume, so `make up` alone will keep reusing the one built before your change and
`make run` fails with `Cannot find module '@serenity-js/...'`. `docker compose up -d
--renew-anon-volumes` fixes it. `docker compose run --rm` builds a fresh volume every time and so
never shows the problem, which is what makes this confusing — and CI never hits it at all.

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

- `API_BASE_URL` — the backend's API base. Defaults to `http://localhost:3001/api`: the **test**
  stack, not the dev stack on 3000.
- `APP_BASE_URL` — the frontend the browser drives. Defaults to `http://localhost:4201`: again the
  **test** stack, whose `/api` proxy points at the same backend `API_BASE_URL` names. Pointing this
  at 4200 would drive a UI wired to a database this suite never truncates.
- `PLAYWRIGHT_DOWNLOAD_HOST` — build-time only, and commented out by default. See Gotchas.
