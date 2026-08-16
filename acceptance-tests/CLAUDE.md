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
(`POST /api/testing/migrations`, `/truncate`, `/clock/reset` and `/clock/advance`, plus
`GET /api/testing/emails`) mount only at `NODE_ENV === 'test'`, so they simply don't exist on
3000 — and a run can never truncate dev data. The frontend has no such switch; what keeps it honest
is `API_PROXY_TARGET`, which points 4201 at 3001 and 4200 at 3000.

Start them with `make -C ../backend test-up` and `make -C ../frontend test-up`, or let the root
`make run-acceptance-tests` do the whole sequence: both test stacks up, this container up, suite run.

## Which door a step goes through

The suite is **blended** (BDD in Action, ch15): the browser where the browser is the point, HTTP
everywhere else. All 35 of its examples are automated; **nine** of them drive the UI and the other
twenty-six stay black-box HTTP. That 26% is deliberate, not a staging post — ch10 puts UI tests at
"a small minority" of an acceptance suite. Login is what took the share there from 12%: six of its
eight scenarios go through the browser, and three of those six are the session-lifecycle scenarios,
which have no API door to take — there is no logout endpoint and no session resource, so what the
browser does *is* the rule.

| Scenario                     | Door                       | Why                                                                                                       |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Successful sign-up           | **UI**                     | ch10 reason 1: a key user journey                                                                           |
| Already registered email     | `Given` **API**, rest **UI** | ch10 reason 3: screen-specific logic — a `409` is only worth something if the visitor is *told*, beside the offending field |
| Weak password (×6)           | **API**                    | ch10: proving a password rule through a form "would be wasteful"                                            |
| Invalid email (×5)           | **API**                    | ch10's canonical waste case                                                                                 |
| Missing data (×4)            | **API**                    | The form never submits an empty required field, so a UI version would document a *different* rule           |
| Successful password reset    | `Given` **API**, journey **UI**, closing `Then` **API** | ch10 reason 1: a key user journey, and the second one this suite demonstrates end to end — asking for the link, following it out of the inbox, and getting back in with what they chose. The last step, that the *old* password no longer works, goes back through the API: it is a backend rule with nothing to see, and driving it through the form would mean logging the visitor out of the session the journey just proved |
| Unknown email, expired link, link used twice, weak new password (×6) | **API** | Backend rules about who has an account, how long a token lives and how strong a password must be. No screen is the point, and six examples through two forms would be the waste ch10 warns about |
| Successful login | **UI** | ch10 reason 1: a key user journey, and the third this suite demonstrates end to end |
| Wrong password, unknown email | **UI** | ch10 reason 3: screen-specific logic. The rule is that both are refused *identically* — the visitor is told nothing about whether the address exists — and "identically" is only observable where a visitor reads it. Both scenarios therefore carry the **same** `Then` line, deliberately |
| Missing credentials (×2), invalid email (×3) | **API** | ch10's waste case again, exactly as the sign-up outlines. Note login rejects a malformed address as `400` rather than `401`, which is why it is worth documenting here as well as under sign-up |
| Logging out, profile page is private, expired session | **UI** | Session lifecycle has no API surface to check: no logout endpoint, no session resource. "Expired session" is the one with a real alternative — `GET users/me` with a two-hour-old token answers `401` — but the suite has no bearer-token plumbing for authenticated API calls, and being bounced to the login page is the rule a business would state |

The **Door** column is the record of a decision taken once, when the feature was mapped, rather
than re-taken scenario by scenario. Change the ratio here, deliberately, not by drift.

`POST password-resets` answering `404 user-not-found` for an address nobody registered is the rule
the business agreed, and this suite asserts it as built. The user-enumeration trade-off that implies
is theirs to revisit, not this suite's to soften.

**Grammatical voice is the signal.** `Given Ariana already has an account` is passive — we care only
*that* it is true, so it takes the API. `When he signs up` is active — we are demonstrating *how*,
so it drives the browser. Cucumber matches the two voices with different expressions, so the split
happens at the step-definition level with nothing to configure. It is a signal rather than a law:
`When Fateme requests a password reset` is active yet goes through the API, deliberately — like the
weak-password outlines it documents a backend rule, and no screen is the point. `When he logs in
without providing his email` is the same case one feature over.

**The feature file knows nothing about any of this**, and that is the property to protect. Every
step text already maps to exactly one door: `should be able to login` appears only in the sign-up
journey, `should not be able to login` only in the outlines, `should not be able to login with X's
email` only in the duplicate-email scenario, `should be able to login with his new password` only in
the successful reset, and the two `should still be able to login with his …` variants only in the
scenarios where a reset was rejected. `login.feature` keeps that property by making login the
*subject* rather than a consequence — `he logs in`, `he logs out`, `he tries to reach his profile
without logging in` — so not one of its sentences collides with the five above. There are no
`@ui`/`@api` tags and no Cucumber profiles — adding them would put an automation concern into a
document written for the business.

The one place two scenarios deliberately **share** a sentence is
`the login should be rejected due to an incorrect email or password`, which closes both "Wrong
password" and "Unknown email". That is not a collision to fix: one step definition, one door, and
repeating the line is what publishes the non-enumeration rule to a reader of the documentation.

**What this suite deliberately no longer asserts.** The RFC 9457 envelopes for
`409 user-already-exists` and `401 invalid-credentials` are gone, because the scenarios that used to
check them now watch the screen instead. Per ch13 §13.6, the shape of an error response is an
API-design detail and belongs to the backend's own tests. `EnsureProblemDetail` remains, and is
still the right tool for the validation outlines and the password-reset rejections.

## Commands

Runs in Docker via the Makefile. Prerequisites: Docker, Docker Compose, `make`, and **both test
stacks running** — `make run` drives a browser at the frontend on 4201, so a suite run against the
backend alone now fails rather than merely covering less. The root `make run-acceptance-tests`
starts both in the right order.

```bash
make up                  # build (if needed) and start this container in the background
make down                # stop and remove the container
make restart             # down, then up
make build               # rebuild the image
make ps                  # container status
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

Two things to know about their reach. They cover **only** `screenplay/`, `step-definitions/` and
`support/` — `cucumber.cjs`, the configs, and every `.feature` file are neither linted nor
formatted. And ESLint runs Prettier as a rule here, so `make fix-lint` already reformats and
`make fix-format` is a cheap re-check. `.prettierrc` sets no `printWidth`, so this project wraps at
80 columns — narrower than the frontend's. Code pasted from there will be reflowed.

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
npx cucumber-js --dry-run --format summary           # resolve every step without running it
npx tsc --noEmit                                     # typecheck
```

`--dry-run` is the cheapest way to prove a new step definition is neither missing nor ambiguous: it
matches every step and runs none of them, so it needs no stack up.

`npm test` is `node --env-file=.env … cucumber-js`, and that flag is load-bearing: **it fails
outright if `.env` is missing**, since Node exits on an unreadable `--env-file`. The `npx` forms
above skip it and work anyway, because Compose supplies the same variables through `env_file` — so
they only work *inside* the container.

`tsconfig.json` lists `"dom"` in `lib` even though this is a Node process. That is correct and
needed: Playwright's types describe browser APIs. The reason is in a comment there; don't tidy it
away.

### Pending scenarios, and what `@wip` actually means

Two different things can be unfinished about a scenario, and they are marked differently. Getting
this backwards either publishes a rule nobody signed off, or hides agreed behaviour from the
documentation:

| State | Marker | In the living documentation? |
| ----- | ------ | ---------------------------- |
| The **business** hasn't settled it — wording or the rule itself still under discussion | `@wip` | **No.** `npm test` filters it out with `--tags 'not @wip'`, deliberately: unagreed behaviour must not be published as a description of the system. |
| Agreed by the business, **not automated yet** | **no tag**; step definitions that `return 'pending'` | **Yes**, as Pending. This is the default for specification written ahead of implementation. |
| Agreed and automated | no tag; real step definitions | Yes, as Passing. |

"Not automated yet" is **not** a reason to reach for `@wip`, and removing the tag is a business
decision rather than an engineering one.

**Today the suite is entirely in the bottom row**: all 35 examples are automated and passing, no
scenario carries `@wip`, and nothing `return`s `'pending'`. `login.feature` was the last inhabitant
of the middle row and the unusual case of it — the backend and the frontend both implemented all of
it, and it was the *automation* that was outstanding rather than the feature. Writing Gherkin ahead
of the backend, as forgot-password did, is the more common route in.

Three things to know when the next batch of placeholders is written:

- **`strict: false` in `cucumber.cjs` is what keeps the run green.** Cucumber fails on an
  `UNDEFINED` step *unconditionally* — only `PENDING` is governed by `strict`. So a *missing* step
  definition still breaks the build, as do ambiguous and failing ones; nothing but an explicit
  `return 'pending'` is tolerated. **Watch the exit code, not the summary**: Serenity maps
  `UNDEFINED` and `PENDING` to the same `ImplementationPending` outcome, so a forgotten definition
  still prints as "pending" in the console summary and in the report. Only the non-zero exit
  distinguishes it.
- **Don't redefine a step another feature already implements.** A second definition is ambiguous,
  which fails whatever `strict` says. Background steps are where this bites, because they are shared
  across feature areas by design: `Given {actor} already has an account` opens every forgot-password
  and login scenario and lives in `step-definitions/registration/sign-up.steps.ts`, so those
  scenarios really do hit the backend before anything of their own runs. Leave a comment where the
  redefinition would have gone, and let `npx cucumber-js --dry-run` prove there is exactly one match.
- **Arity must match the captured parameters**, or Cucumber rejects the definition. Name the unused
  ones `_actor`, `_password` — ESLint's `argsIgnorePattern` is `^_`.

## Architecture

```
specs/                                  # Gherkin. Organised by feature area, not by backend module
├── registration/sign-up.feature
├── authentication/forgot-password.feature
└── authentication/login.feature
step-definitions/                       # Thin: each step just delegates to a task
├── registration/sign-up.steps.ts
├── authentication/forgot-password.steps.ts
└── authentication/login.steps.ts
screenplay/                             # DOMAIN layer: what an actor does, in business language
├── common/                             # Reusable across feature areas
│   ├── clock.ts                        # LetTimePass (expired reset link, expired session); FreezeTimeAt — no call site
│   ├── inbox.ts                        # CheckTheirInbox, TheMessagesInTheirInbox — the test-only outbox
│   ├── notes.ts                        # AccountNotes (details, credentials, resetLink); TheDetailsTheySignedUpWith, TheCredentialsTheyLoggedInWith
│   └── problem-detail.ts               # EnsureProblemDetail, EnsureValidationErrorFor, FieldsThatFailedValidation, problemTypeFor
├── ui/                                 # INTEGRATION layer: Lean Page Objects. Locate and report only
│   ├── form.ts                         # Form.inputFor/errorFor/buttonCalled/errorSummary/notice — by label, via the query language
│   ├── forgot-password-page.ts         # ForgotPasswordPage.emailField/submitButton/confirmation/linkOnTheLoginPage
│   ├── reset-password-page.ts          # ResetPasswordPage.newPasswordField/submitButton
│   ├── profile-record.ts               # ProfileRecord.valueOf('Name' | 'Email address')
│   └── site-header.ts                  # SiteHeader.logOutButton/profileLink/logInLink/createAccountLink
├── registration/
│   ├── sign-up.ts                      # SignUp.using | .viaApiUsing, EnsureSignedUp, TheOmittedSignUpField, EnsureRejectedAsDuplicateEmail
│   └── sign-up-details.ts              # signUpDetailsOf, signUpDetailsWithout, requiredSignUpFields
├── authentication/
│   ├── log-in.ts                       # LogIn.using | .viaDirectNavigation | .viaApiUsing, LogOut, TheirOwnCredentials, TheirCredentialsWith, TheOmittedCredential, EnsureLoggedIn, EnsureNotLoggedIn, EnsureAccessGranted, EnsureCredentialsRejected, EnsureNoLongerRecognised, EnsureAskedToLogIn
│   ├── login-credentials.ts            # Credentials, CredentialField, requiredCredentialFields, theCredentialsOf, theCredentialsWithout, theWrongPasswordOf
│   ├── forgot-password.ts              # RequestAPasswordReset / ResetTheirPassword (.using | .viaApiUsing), EnsurePasswordResetRequested, EnsurePasswordReset, EnsureRejectedAsUnknownEmail, EnsureResetLinkExpired, EnsureResetLinkAlreadyUsed
│   ├── reset-link.ts                   # CheckTheirInboxForTheResetLink, TheResetLinkTheyWereSent, TheResetTokenTheyWereSent
│   └── password-reset-details.ts       # theNewPasswordOf, anotherPasswordOf
└── profile/
    └── view-profile.ts                 # ViewTheirProfile.viaTheSiteHeader | .viaDirectNavigation, EnsureProfileMatchesSignUpDetails
support/
├── actors.ts                           # Cast: assigns abilities to every actor
├── config.ts                           # apiBaseUrl (trailing-slash normalised — see Gotchas), appBaseUrl
├── parameter-types.ts                  # Cucumber parameter types: {actor} {actorName} {pronoun} {field}
└── hooks.ts                            # BeforeAll / Before / After / AfterAll: Serenity config, browser, DB reset, cast
cucumber.cjs                            # loads support/ + step-definitions/ via ts-node
```

`LetTimePass` is how a scenario moves time, and two scenarios use it: "Expired reset link" advances
the backend clock two hours past a link that lives one, and "Expired session" the same two hours
past an access token that lives one — which is what makes an expiry testable without waiting for
one. It posts to `testing/clock/advance` through `CallAnApi`, so it reads in the living
documentation as something the actor did. `FreezeTimeAt` beside it still has **no call site** — wire
it up when a scenario needs to start from a specific instant, or delete it; don't assume it is
exercised. The default frozen instant every scenario starts from is set by `support/hooks.ts` with a
raw `fetch`.

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

**Know where that safety net ends.** Reaching an accessible name still means anchoring on some
structure first, and those anchors are ungated: `form app-text-field`, `form button`,
`form [role="alert"]`, `form [role="status"]`, `.field__error`, `dl div`, `app-site-header button|a`.
Several are *provably* unprotected — the accessibility audit visits each route in its initial state
and says so explicitly, so a form's error state is graded by nothing, and neither is the confirmation
banner a successful submit reveals. Rename the `field__error` class or drop the `app-text-field`
wrapper and this suite breaks with no check failing first.

Keep those selectors few, keep them in `screenplay/ui/`, and when one breaks, remember the fix is a
frontend conversation rather than a new `data-test` attribute here.

### Screenplay vocabulary, as implemented here

- **Actors** are the people named in the feature file (Ariana, Fateme). They are created by `Actors` (`support/actors.ts`), Serenity's `Cast`.
- **Abilities** are what an actor *can do*. Every actor gets three: `CallAnApi` (from
  `@serenity-js/rest`), `BrowseTheWebWithPlaywright` (from `@serenity-js/playwright`) and
  `TakeNotes`. Every actor can therefore use either door, and the *task* decides which — that is
  what makes blended testing possible. **Each actor gets their own notepad and their own browser
  context**, so neither what Ariana signed up with nor the session she left behind can leak into
  Fateme's scenario.
- **Tasks** are what an actor *does*, in business language: `SignUp`, `LogIn`, `ViewTheirProfile`. Assertions are tasks too, by convention named `Ensure*` — `EnsureLoggedIn`, `EnsureRejectedAsDuplicateEmail`.
- **Questions** are what an actor *knows*: `TheDetailsTheySignedUpWith`, `FieldsThatFailedValidation`, `TheResetLinkTheyWereSent`.

**Name a task for its goal, put the route in the method name.** Where a goal is reachable more than
one way, the variants live on one class — `SignUp.using` drives the form, `SignUp.viaApiUsing` posts
the payload; `LogIn.using` / `.viaDirectNavigation` / `.viaApiUsing`; `ViewTheirProfile.viaTheSiteHeader`
/ `.viaDirectNavigation`; `RequestAPasswordReset` and `ResetTheirPassword` likewise. That is what
lets a step swap one for another without the feature file noticing. Don't name a task
`SignUpViaTheForm`; the goal is signing up, and the form is how.

Step definitions stay thin — they translate a Gherkin line into `actor.attemptsTo(...)` and nothing more. Logic belongs in tasks. Anything reusable across feature areas goes in `screenplay/common/`.

### Test data

`signUpDetailsOf(actorName)` (`screenplay/registration/sign-up-details.ts`) derives every field from the actor's name — `Ariana` → `ariana@example.com`, firstName `Ariana`, and so on. That is why the feature file names *people* rather than credentials: the details are an implementation detail of the task layer, and one actor can work out another's email without being told it.

**Passwords are deliberately per-actor.** If every actor shared one password, "Fateme logs in with Ariana's email and Fateme's password" would accidentally *be* Ariana's real credentials, and the scenario asserting that login fails would pass for the wrong reason. `theNewPasswordOf` and `anotherPasswordOf` (`screenplay/authentication/password-reset-details.ts`) follow the same rule for the passwords an actor picks when resetting — two of them, so "Reset link used twice" can tell the reset that worked from the one that was refused — and so does `theWrongPasswordOf` (`screenplay/authentication/login-credentials.ts`), the password "Wrong password" logs in with.

`login-credentials.ts` is to login what `sign-up-details.ts` is to sign-up: `theCredentialsOf(name)`
projects the sign-up details down to the two fields the endpoint accepts — it runs a whitelisting
pipe, so a payload still carrying `firstName` is rejected outright — and `theCredentialsWithout`
drops one for the "Missing credentials" outline. It is the file `common/notes.ts` takes the
`Credentials` type from, which is why the type lives there rather than in `log-in.ts`: notes and
tasks both need it, and a leaf module keeps the imports acyclic.

**An actor who never signed up still knows their own credentials**, because they come from their
name. That is what "Unknown email" needs: the Background registers only Ariana, so Fateme's notepad
is empty and `TheirOwnCredentials()` — which reads what an actor *signed up with* — has nothing to
give her.

### Test isolation

`support/hooks.ts`:

- **module load** — `setDefaultTimeout(60_000)`. Cucumber's default of 5s is not enough for a cold
  run: the first navigation also waits out Vite's on-demand compilation of the identity chunk. If a
  step ever fails on a timeout that looks absurdly short, this is the knob.
- **`BeforeAll`** — `configure({ crew })` (Serenity reporters, once for the whole suite), launch
  one Chromium, and `POST /api/testing/migrations`.
- **`Before`** — `POST /api/testing/truncate`, which empties the tables **and the test-only email
  outbox**, so every scenario starts with an empty inbox and no reset link can survive into the
  next one. Then `POST /api/testing/clock/reset` so every scenario starts from the same frozen
  instant and scenario order never matters, then `engage(new Actors(...))`. Engaging a new cast per
  scenario gives fresh actors with fresh, empty notepads **and fresh browser contexts**.
- **`After`** — `serenity.waitForNextCue()`, so a failure's screenshot finishes being written
  before Cucumber tears the scenario down.
- **`AfterAll`** — close the browser.

The browser context matters as much as the truncation. The frontend keeps its access token in
`localStorage`, which a shared context would carry from one scenario into the next; a truncated
database plus a stale token is a confusing failure. One browser per run, one context per actor.
`clock/reset` matters for the same reason now that a scenario expires a *session* as well as a
reset link: leave the clock two hours ahead and the next scenario's freshly issued token is born
expired.

All the testing endpoints are exposed by the backend only when `NODE_ENV === 'test'` — which is why
this suite must be pointed at the test stack, and why pointing it at the dev stack fails in
`BeforeAll` with a 404 rather than quietly wiping a development database.

`hooks.ts` calls them with a plain `fetch` and a hand-built URL, not through `CallAnApi` and
`PostRequest`. That is deliberate — hook traffic is not an actor doing something, and routing it
through Screenplay would put setup noise in the living documentation. Two consequences: these calls
never appear in the report, and the no-leading-slash rule in *Gotchas* does not apply to them.

**`GET testing/emails` is the deliberate exception, and it shows what the rule is actually about.**
It is a testing endpoint like the other four, but it is *not* called from a hook: truncating a
database is nobody's behaviour, whereas checking your inbox is something a person does, and a
password-reset journey that skipped over it would be documenting a different story. So the outbox is
read through `CallAnApi` from `screenplay/common/inbox.ts`, appears in the living documentation as
"#actor checks their inbox", and does obey the no-leading-slash rule. Ask of any new testing
endpoint whether an actor is *doing* something; if not, it belongs in a hook with the other four.
`LetTimePass` is the same call made the same way, and for the same reason: waiting two hours is
something that happens *to* the actor in the story.

The outbox itself exists because no email provider has been chosen yet. `GET testing/emails?to=…`
returns `{ to, subject, body, sentAt }`, newest first; `screenplay/authentication/reset-link.ts` is
the only thing that parses a message, and it is the one place that knows what a reset email looks
like.

### Assertion conventions

**One reusable envelope check, then one distinguishing fact.** `EnsureProblemDetail(status, slug)` (`screenplay/common/problem-detail.ts`) asserts the whole RFC 9457 envelope — `Content-Type: application/problem+json`, `type`, `title`, `status`. Domain-specific tasks build on it and add only what makes them different.

Four tasks build on it: `EnsureValidationErrorFor`, and the three password-reset rejections
(`EnsureRejectedAsUnknownEmail`, `EnsureResetLinkExpired`, `EnsureResetLinkAlreadyUsed`). No step
definition calls `EnsureProblemDetail` directly, and `problemTypeFor` is used only inside that
module. Note that the `type` base URL it expects is hardcoded here and hardcoded again in the
backend, with nothing keeping the two in step.

**Assert `type`, not `detail`.** `type` is always present and is the diagnostic field; `detail` is optional per RFC 9457.

**Assert the API as it is built, not as you wish it were.** The backend reports weak password, invalid email and missing data all as the same `validation-error` problem type — the offending field is what tells them apart, on login exactly as on sign-up, which is why both features' outlines end in `EnsureValidationErrorFor(field)`. Do not assert problem types the backend does not emit; that turns a passing scenario into a parked pending one. The dedicated types are `409 user-already-exists`, `404 user-not-found`, `410 password-reset-expired` and `410 password-reset-already-used`.

**Where the field isn't named in the Gherkin, work it out from what was sent.** "Missing data" and
"Missing credentials" both close with a step that says only "rejected due to missing required data",
so `TheOmittedSignUpField` and `TheOmittedCredential` recover the field by comparing what the actor
noted down submitting against what the endpoint requires. That is what `AccountNotes.credentials` is
for; both `LogIn` routes write it.

**Through the UI, assert what the visitor sees.** The same discipline, one door over: a UI step
asserts the rendered message, the page it stayed on, whether the header offers "Log out". It never
reaches behind the page for a status code or a token — those aren't things a visitor can observe,
and a test that checks them isn't testing the interface it claims to. `EnsureProfileMatchesSignUpDetails`
deliberately makes no claim about the account's id, because the profile page doesn't show one. In the
same spirit, nothing asserts that a successful reset issues no session: the next step simply logs in
through the browser, which can only find the header's "Log in" link if no session exists.

Two of those UI assertions are worth knowing individually, because both were tempting to write
wrongly:

- `EnsureNoLongerRecognised` — "the site no longer recognises him" — asks what the **header offers**
  (`Log in` back, `Log out` gone), not whether a token survived somewhere. It is the browser-side
  counterpart of `EnsureNotLoggedIn`, which reads `LastResponse` and is useless through a browser.
- `EnsureAskedToLogIn` — shared by "Profile page is private" and "Expired session", two causes, one
  experience — asserts the login form and `/login`, and **deliberately says nothing about
  `returnUrl`**. The frontend falls back to `/profile` when there is none, and `/profile` is the only
  guarded route, so a `returnUrl` assertion would pass even if the feature were broken.

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

`isVisible()` is safe to wait on even when the element is absent: it is `and(isPresent(), …)`, and
`and` short-circuits, so a conditionally rendered banner polls rather than erroring. That is what
lets `Wait.until(Form.notice(), isVisible())` work against a confirmation that isn't in the DOM
until the submit succeeds — and what lets `EnsureNoLongerRecognised` say `not(isVisible())` about a
"Log out" button that has left the DOM entirely.

**Submitting a form means clicking *and waiting for the answer*.** `SubmitTheLoginForm` polls until
the site has had its say — the visitor has either been taken somewhere else or told what was wrong —
because a person doesn't walk away from a form mid-request. This is not defensive coding; it is the
one thing that made "Expired session" honest. That scenario is the only one that follows a login
with an *action* rather than an assertion, and every other browser login in the suite happens to be
followed by a step that waits (`EnsureLoggedIn`, `EnsureCredentialsRejected`, `LogOut`), which hid
the gap for as long as it existed. Landing on the profile takes around half a second; without the
wait, the clock advance and the re-navigation to `/profile` both went out while the login was still
in flight, Playwright's navigation was swallowed by the app's own, and the original page went on to
load the profile with a token that was still valid when it asked — a failure that had nothing to do
with expiry. When the login request lost the race outright the visitor was never signed in at all,
and the scenario would have *passed* while proving nothing.

**Two locate tasks navigate from `/`, one follows a link out of an inbox, and the login form has
two routes of its own.** `LocateTheSignUpForm` and `LocateTheForgotPasswordForm` start from `/`;
`LocateTheResetPasswordForm` follows the link out of the actor's inbox, which is how a real visitor
reaches that page. `LocateTheLoginForm` has `viaTheSiteHeader`, which clicks the header's "Log in"
link on whatever page is already open — what a returning visitor browsing the site does, and the
route `sign-up.feature` and the password-reset journey take — and `viaDirectNavigation`, which opens
`/login` cold. `LogIn.using` and `LogIn.viaDirectNavigation` are the two doors onto them.

**Take the direct route whenever nothing has opened a page yet.** `login.feature`'s Background is
API-only, so every one of its UI scenarios starts on `about:blank`, where the header route fails
with `ListItemNotFoundError`. Both are things a returning visitor really does, so this is a choice
between two truths rather than a workaround.

`ViewTheirProfile` splits the same way, and its direct route is load-bearing twice over: an
anonymous visitor is offered no "Profile" link to click, and a visitor whose session expired while
looking at the page needs the page **fetched again** — a router-internal navigation to a URL already
open re-renders nothing, so no `GET users/me` goes out, nothing is refused, and "Expired session"
would pass while proving nothing.

### Living documentation

Two phases:

1. `make run` — the `@serenity-js/serenity-bdd` crew member writes one raw JSON file per scenario,
   into the directory `ArtifactArchiver` is configured with in `support/hooks.ts`
   (`target/site/serenity/`), and `Photographer.whoWill(TakePhotosOfFailures)` drops a PNG
   beside it whenever a UI step fails. Failures only: a photo per step would swamp the report, and
   a failed UI step can name the element it wanted but not show you the page it was looking at.
2. `make render-living-documentation` — shells out to the Serenity BDD **Java** CLI to aggregate those into a browsable HTML site at `target/site/serenity/index.html`. This is why the Dockerfile installs `default-jre-headless`. It renders whatever the last run produced; it does not run any tests.

`target/` is bind-mounted, so the living documentation opens straight from the host. `make open-living-documentation` does phase 2 and then opens `index.html` in the default browser — the one target that runs on the host rather than in a container, because a browser cannot be launched from inside one. Like `render-living-documentation`, it needs the container up.

Artifacts **accumulate** across runs — if the counts look wrong, or a fixed failure's screenshot is
still sitting there, clear it out and re-run. The files are written by the container as root, so
`docker compose exec app rm -rf target` rather than `rm -rf target` from the host.

The target is named for what it produces, not for the tool that produces it — the npm script it wraps keeps its own name (`npm run report`), the same way `lint-architecture` wraps `npm run depcruise` in the backend.

## Gotchas

**Resource URIs must be relative, with no leading slash.** Serenity's `CallAnApi` resolves them with `new URL(uri, apiBaseUrl)` — *not* axios's `combineURLs`. `new URL('/users', 'http://host/api')` discards the `/api` segment and yields `http://host/users`, so every request 404s. `support/config.ts` guarantees the base URL ends in a slash; always write `PostRequest.to('users')`, never `PostRequest.to('/users')`. Browser navigation is the opposite: `Navigate.to('/login')` resolves against the Playwright context's `baseURL`, and there the leading slash is right.

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
   Its good-news counterpart `Form.notice()` (`form [role="status"]`) is the opposite case: it is
   rendered only once there is something to say.
2. **A field error renders only once the field is `touched()`.** Submitting touches everything, so
   assert after a submit, never before.
3. **A server error clears the moment its field is edited.** Assert it before typing anything else.

A fourth, one layer up: **a rejected login is reported on the banner, never beside the email
field** — the app deliberately declines to say which of the two was wrong. A duplicate email at
sign-up is the mirror case, reported *on the field* because there the point is to say exactly what
is wrong and where.

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

**`actorCalled()` moves the spotlight.** Steps with no explicit subject (`Then the sign-up should be rejected...`) resolve their actor via `actorInTheSpotlight()`, which is whoever was named last. That is what the `{actorName}` parameter type is for: it yields a bare name string *without* summoning the actor. In `Fateme signs up with Ariana's email`, using `{actor}` for both names would leave **Ariana** in the spotlight, and the next `Then` would read her empty `LastResponse` instead of Fateme's. The same rule is what makes `When Fateme logs in` and `When Fateme requests a password reset` use `{actor}` rather than `{pronoun}`: the feature file names somebody who is *not* the actor in the spotlight, and naming her is what puts her rejection in front of the following `Then`.

The parameter types (`support/parameter-types.ts`):

| Type | Matches | Resolves to |
|------|---------|-------------|
| `{actor}` | `Ariana` | `actorCalled(name)` — creates the actor, takes the spotlight |
| `{actorName}` | `Ariana` | the plain string — no actor, no spotlight change |
| `{pronoun}` | `he`, `she`, `they` | `actorInTheSpotlight()` |
| `{field}` | `email`, `password`, `first name`, `last name` | the payload key (`firstName`, `lastName`) |

`{field}` yields any of the four sign-up fields, but only two of them are credentials — so
`login.steps.ts` declares that parameter as `CredentialField` rather than `SignUpField`. Cucumber's
own types are loose enough not to notice; the narrower type is there to say which half of the
mapping that step can legitimately see.

## Environment

`.env` (copied from `.env.example` by `make setup`, which `make up` runs for you):

- `API_BASE_URL` — the backend's API base. Defaults to `http://localhost:3001/api`: the **test**
  stack, not the dev stack on 3000.
- `APP_BASE_URL` — the frontend the browser drives. Defaults to `http://localhost:4201`: again the
  **test** stack, whose `/api` proxy points at the same backend `API_BASE_URL` names. Pointing this
  at 4200 would drive a UI wired to a database this suite never truncates. It is also the origin
  `screenplay/authentication/reset-link.ts` expects an emailed reset link to start with, so the
  backend test stack has to build its links from the same value — if the two disagree, every reset
  scenario fails while reading the inbox, with a message naming the pattern it wanted.
- `PLAYWRIGHT_DOWNLOAD_HOST` — build-time only, and commented out by default. See Gotchas.
