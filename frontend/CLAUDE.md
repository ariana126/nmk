# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Skills.** Invoke the ones that fit before writing code:

- `angular-developer` — the Angular team's own guidance, vendored into `.claude/skills/` (pinned in
  `skills-lock.json`, from `angular/skills` on GitHub) and scoped to this directory. Its `SKILL.md`
  is an index: it routes to a `references/*.md` page per topic — signals, `linkedSignal`, `resource`,
  effects, signal/reactive/template-driven forms, DI and injection context, routing and guards,
  pipes, Angular Aria, component styling and Tailwind, testing and harnesses, CLI and migrations.
  Read the reference for the topic at hand rather than working from memory; Angular's API surface
  moves fast and this is version-current. The "Angular & TypeScript best practices" section below
  is the short form of the same advice — the skill is where the detail lives.
- `angular-new-app` — scaffolding a _new_ Angular app from scratch. Not applicable here: this app
  already exists. Its `ng generate` recipes still apply, but see the caveat below.
- `handbook:oop-guideline` — components, services and signals-as-state: what belongs where,
  immutability, dependency injection.
- `handbook:test-guideline` — what to test in a component, what to fake, black-box thinking for the
  Vitest specs.
- `superpowers:test-driven-development` — before implementing any component or service.
- `frontend-design:frontend-design` — any new UI or visual reshaping; aesthetic direction, not just
  markup.
- `run` and `claude-in-chrome` — to actually look at the rendered page. `frontend-design` ends in a
  critique pass that can't be done by reading templates.

Both Angular skills assume a host toolchain and tell you to run `ng` directly. Here there is none —
`ng` lives in the container's `node_modules` (an anonymous volume; the repo is bind-mounted at
`/app`, so generated files do land on the host). Translate every `ng <cmd>` the skill gives you into
`docker compose run --rm app npx ng <cmd>`, or the Make target where one exists. In particular the
skill's "run `ng build` when you're done" step is
`docker compose run --rm app npm run build` — note `make build` is Docker's, it rebuilds the image.

**The `angular-cli` MCP server.** The Angular CLI's own MCP server, declared in the root `.mcp.json`
as `npx -y @angular/cli@21 mcp --read-only`. Six tools, and it discovers this workspace on its own —
`list_projects` finds `frontend/angular.json` from the monorepo root, no configuration needed:

- `search_documentation` — queries `angular.dev`, clamped to the workspace's own major version.
  **Prefer this over `context7` for anything Angular**; `context7` is generic across versions.
- `get_best_practices` — the guidelines shipped inside the _installed_ `@angular/core`.
- `find_examples` — official code examples. Reach for it on "show me how to…", where
  `search_documentation` answers "what is…".
- `list_projects` — workspace and project layout; builder, source root, style language.
- `ai_tutor` — a curriculum for teaching Angular concepts.
- `onpush_zoneless_migration` — an iterative plan for moving to `OnPush`/zoneless. It only _emits
  instructions_; you apply each one, then call it again.

This overlaps the `angular-developer` skill without replacing it: the skill is pinned, offline prose
vendored in `.claude/skills/`, while `get_best_practices` reads whatever `@angular/core` is actually
installed. Use both.

**It never runs anything.** All six tools are read-only and none of them invoke `ng` — that is what
`--read-only` guarantees, by barring the CLI's experimental `build`, `test`, `e2e` and `devserver`
tools, which would shell out to `ng` on the host and bypass the container. Building, testing,
linting and serving stay exactly as described above: Docker, via the Makefile. And the server itself
must run on the host, not in the container — it sandboxes itself to the host paths Claude Code
advertises, which do not exist under `/app`, so a containerised copy finds no workspace at all.

## Monorepo integration

An Angular 21 app (project `nmk-frontend`), one subproject of a monorepo. **Read the root
`../CLAUDE.md` for the cross-cutting picture**; this section covers only how the frontend plugs in.

Everything runs in Docker via the `Makefile` — one `app` service defined in `docker-compose.yml`,
built from the `Dockerfile` (`node:24-bookworm-slim`), served by two Compose projects (see
[Two stacks](#two-stacks) below). The Makefile speaks the monorepo's shared vocabulary, so the root
Makefile's fan-out targets reach it:

- `make up` / `make down` — start/stop both dev servers (`ng serve`, http://localhost:4200 and
  http://localhost:4201), `up` waits until each serves.
- `make lint` / `make fix-lint` — ESLint (`ng lint`); the bare target is read-only, `fix-` writes.
- `make format` / `make fix-format` — Prettier; same read-only/writing split.
- `make run-unit-tests` — Vitest (jsdom), runs once and exits. Wired into the root `run-unit-tests`, so CI gates it.
  `ng test` watches by default, which would hang the target and CI, so `npm test` pins `--watch=false`; watching is
  the separate `npm run test:watch`, mirroring the backend's `test` / `test:watch` split. Keep that flag.
- `make lint-accessibility` — the axe-core audit, in a real browser. The one target here that needs
  the app running; see [Accessibility](#accessibility) below.
- `make sh`, `make logs`, `make npm <script>` — shell, logs, and any package.json script in the container.

Every check but `lint-accessibility` runs in a throwaway container
(`docker compose run --rm app npm run <script>`) needing nothing else up — no Node install, no browser
(Vitest uses jsdom). That is what lets CI run those gates with no setup and no secrets. Make targets
are verb-object hyphenated (`fix-format`); the wrapped package.json scripts keep the colon
(`format:fix`).

The frontend rides the root's existing `lint`/`format`/`run-unit-tests` fan-out, so CI covers it with
no workflow change. A _new kind_ of check would also need a root target, a CI job, and a
`run-guardrails` line — see `../CLAUDE.md`. `lint-accessibility` is the worked example of that: a
frontend-only gate with all four pieces.

### Two stacks

The same image runs as two Compose projects, and `up` and `down` act on **both** — the backend's
split, mirrored:

|                    | dev                          | test                                   |
| ------------------ | ---------------------------- | -------------------------------------- |
| Compose project    | `nmk-frontend`               | `nmk-frontend-test`                    |
| Files              | `docker-compose.yml`         | `+ docker-compose.test.yml`            |
| Env file           | `.env` (from `.env.example`) | `.env.test` (from `.env.test.example`) |
| Published port     | 4200                         | 4201                                   |
| `API_PROXY_TARGET` | backend dev, `:3000`         | backend test, `:3001`                  |

The override file is five lines: the test stack is the same image with a different env file.
Only the _host_ side of the port mapping moves — `${APP_PORT:-4200}:4200` — so the container still
serves on 4200 and the healthcheck and `A11Y_BASE_URL` need no second value.

Target the test stack on its own:

```bash
make test-up             # build (if needed) and start just the test server, waiting until it serves
make test-down           # stop and remove just the test stack
make test-setup          # create .env.test from .env.test.example (make setup already does this)
```

**Why the split.** `make run-acceptance-tests` runs the suite against the backend's **test** stack,
which has its own database and gets truncated between scenarios. A frontend pointed at the dev
backend would be the wrong subject for that suite, and pointing the single stack at the test backend
instead would leave nothing to develop against. Two stacks, differing by port and proxy target, let
both be up at once — the normal state after `make up`.

Unlike the backend there is **no `NODE_ENV` switch**: nothing in `ng serve` changes behaviour on it,
and the frontend has no equivalent of `TestingModule` to gate. The two stacks differ by the port
they publish and the backend they proxy to, and by nothing else. Don't add one to "match".

Everything else stays on the dev stack — `logs`, `sh`, `npm`, `build`, `lint-accessibility`, and
every `docker compose run --rm` check. Those publish no ports, so they are safe to run while either
stack owns 4200 or 4201. There is no `test-reset`: unlike the backend there is no database volume to
wipe.

## The API client is generated — never hand-write it

HTTP services and their models are generated from an OpenAPI contract by
[orval](https://orval.dev) (`client: 'angular'`). Do not write a service that calls `HttpClient`
against the API by hand, and do not edit anything under `src/app/api` — the next command overwrites it.

| Path               |                                     |                                      |
| ------------------ | ----------------------------------- | ------------------------------------ |
| `api/openapi.json` | the contract                        | committed, but **not** hand-editable |
| `orval.config.ts`  | the generator config                | committed                            |
| `proxy.conf.mjs`   | where `/api` is forwarded           | committed                            |
| `src/app/api/`     | `<tag>/<tag>.service.ts` + `model/` | **generated, gitignored**            |

`api/` sits beside `src/`, not inside it, because the spec is an input to the build rather than
something TypeScript compiles or Angular serves — `tsconfig.app.json` includes only `src/**/*.ts`,
and `angular.json`'s asset glob covers only `public/`.

**You never run the generator explicitly.** `npm run generate:api` is wired to npm's `prestart`,
`prebuild`, `pretest`, `pretest:watch`, `prelint` and `prelint:fix` hooks, so `make up`,
`make run-unit-tests`, `make lint` and `make fix-lint` each rebuild the client from the committed
spec first. That is why
the generated tree can be gitignored without any command ever seeing a stale or missing client.
Nothing in this project reaches outside it: the contract is a file that lives here, which is what
keeps the project standalone.

`api/openapi.json` is refreshed from the API's own spec by **`make sync-api-contract`, run from
the monorepo root** — the only place allowed to name two projects at once — and `make
lint-api-contract` fails CI when the copy goes stale. It is in `.prettierignore` alongside the
vendored skills: the gate compares bytes, so reformatting would break it.

A `.claude/hooks` guard refuses hand edits to the contract, to everything under `src/app/api`, and
to the vendored skills and their `skills-lock.json` pin, naming the command that regenerates each —
the same treatment `backend/dist` and `acceptance-tests/target` get. `orval.config.ts` is not
guarded: it is the hand-written knob.

Two settings in `orval.config.ts` are deliberate and commented there:

- **`retrievalClient: 'httpClient'`, not `'httpResource'`.** The `angular-developer` skill's
  `references/resource.md` says to prefer `httpResource`, but the v21 API reference still marks it
  **experimental (since v19.2)** and it is GET-only — it cannot express a `POST`. Reads that want a
  signal should wrap the returned Observable in `rxResource()`. Individual operations can opt in via
  `override.operations.<operationId>.angular.retrievalClient`.
- **No `baseUrl`.** Routes stay relative (`/api/users`), keeping the deployment target out of
  generated code. What forwards them is `proxy.conf.mjs` — see [Reaching the API](#reaching-the-api)
  below. Never put an address in the generator config.

Authentication is _not_ generated. The contract's `bearer` scheme belongs in a functional
`HttpInterceptorFn` registered as `provideHttpClient(withInterceptors([...]))` in `app.config.ts`,
not threaded through every generated call.

### Reaching the API

The generated client asks for `/api/users`; `proxy.conf.mjs` is what turns that into a real backend.
It is the dev server's `proxyConfig` (wired in `angular.json`'s `serve` target) and **the only place
in this project that names the backend's address**:

```js
const target = process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000';
export default { '/api/**': { target, changeOrigin: true } };
```

That indirection is the point: the two stacks are one image differing by one env var, and every
request stays same-origin so the backend needs no CORS. Three things about it are deliberate:

- **`.mjs`, not the conventional `proxy.conf.json`.** JSON cannot read the environment, and reading
  the environment is the whole job. `@angular/build` imports any non-`.json` proxy config as a
  module (`utils/load-proxy-config.ts`), so this is supported, not a trick.
- **Beside `src/`, not inside it** — same reasoning as `api/` and `a11y/`: it is tooling, not
  something Angular compiles or serves. The Angular CLI docs put it in `src/`; this project's own
  convention wins.
- **`host.docker.internal`, not a service name.** The backend is a separate Compose project with
  its own network, so no service-name DNS reaches it — only the ports it publishes on the host.
  `docker-compose.yml` maps that name with `extra_hosts: host.docker.internal:host-gateway`. This
  is the third Docker-networking gotcha in this project, alongside the two in
  [Accessibility](#accessibility).

**Not `environment.apiUrl` + `fileReplacements`.** That remains the right mechanism for a _deployed_
build, where there is no dev server to proxy through, and it is what the `angular-developer` skill's
`references/environment-configuration.md` describes. It is the wrong one here: environment files are
build-time, so two targets would mean two builds where two env files suffice, and it would put the
browser on a cross-origin call to `:3001` — CORS on the backend, for a problem the proxy does not
have.

Nothing here breaks the monorepo's one-way dependency: `API_PROXY_TARGET` is a URL, not a path.
Nothing under `frontend/` resolves into `backend/`, and the project still builds if copied elsewhere.

The home page renders an illustrative excerpt of the sign-up scenario from the acceptance suite's
feature file. It is deliberately **not** a live-synced copy — there is no `cmp` like the API
contract, no gate, and no obligation to update it when the feature file changes. Treat it as
marketing prose inspired by the source, not a quotation that must stay true to it.

### Testing against it

Generated code is not worth testing; the code that _calls_ it is. In `TestBed`, provide
`provideHttpClient()` **and** `provideHttpClientTesting()`, then assert requests through
`HttpTestingController`. Per `references/testing-fundamentals.md`, this project is zoneless: never
`fixture.detectChanges()` — Act, then `await fixture.whenStable()`, then assert, which is the shape
`src/app/app.spec.ts` already uses.

**There is no `vitest.config.ts`, and adding one would do nothing.** `angular.json`'s `test` target
is `@angular/build:unit-test` with no options at all, and that builder's `runnerConfig` defaults to
`false` — it does not go looking for a Vitest config file. The defaults it applies are the Vitest
runner and, with no `browsers` set, jsdom. If you genuinely need a runner setting, add it to
`angular.json`.

**`describe`/`it`/`expect`/`beforeEach`/`afterEach` are imported explicitly from `vitest`** in every
spec, not pulled in via `vitest/globals` ambient types (`tsconfig.spec.json` sets `"types": []`, same
as `tsconfig.app.json`). The globals mode is what Vitest's own docs default to, but WebStorm's
TypeScript service cannot fully resolve `it`'s type through it — `typeof import('vitest')['it']`
inside `vitest/globals.d.ts`'s `declare global` block evaluates to `{}` there (`describe`'s simpler
`SuiteAPI` type is unaffected), even though `tsc --noEmit` is clean both on the host and in the
container. An explicit `import { it } from 'vitest'` sidesteps the ambient-global-plus-`typeof`-
indexing path entirely. Keep new specs consistent with this — don't reintroduce `vitest/globals`.

> `references/creating-services.md` in the vendored skill tells you to write `@Service()`. **That
> decorator does not exist in the installed `@angular/core` 21.2.x** — only `Injectable` is
> declared. Ignore that page's decorator advice.

The generated tree is written by a container running as root, so it is root-owned on the host:
`git clean` and `rm -rf` need `sudo`, or run them through `docker compose run --rm app`. The
Angular build cache used to be the same nuisance; it now lives in an anonymous volume
(`- /app/.angular`) and never reaches the host at all — that volume is there because two dev
servers sharing one dependency-optimizer cache would race, and losing the root-owned directory is
the bonus.

**If `make up` dies with `orval: not found`,** the long-lived container is reusing an anonymous
`node_modules` volume created before orval was installed — `docker compose run --rm` builds a fresh
one every time and so never shows the problem. Rebuild once with
`docker compose up --build -d --renew-anon-volumes`. This is the same stale-anonymous-volume trap
described for the backend's Prisma client, and it bites after any dependency change; a fresh clone
and CI are unaffected.

## Directory layout

```
src/app/
  app.ts, app.html, app.css   the shell: site header, router outlet, live region
  app.config.ts               providers — HTTP, router, interceptors
  app.routes.ts               the route table
  core/       singletons and cross-cutting concerns — no UI. Injected anywhere.
    http/       interceptors, HttpContext tokens, problem-details narrowing
    identity/   SessionStore, IdentityGateway, the storage-key module
  features/   routed pages, lazy, one chunk per feature
  ui/         presentational components, route-agnostic
  api/        GENERATED. Off-limits; see above.
```

This mirrors the backend's `framework/` vs `modules/identity/` split, so the two projects describe
themselves with the same vocabulary. The identity pages share **one** lazy chunk rather than one
each: they share the server-error mapping and the field markup, and a visitor on `/login` is usually
one step from `/profile`.

**Specs are co-located** — `foo.spec.ts` sits beside `foo.ts`, not in a parallel tree. That is why
`tsconfig.spec.json` includes `src/**/*.spec.ts` while `tsconfig.app.json` excludes it; keep both in
step if you ever move them.

Two things about the shell that a new page has to cooperate with:

- **Every route must declare a `title`.** `App` reads it off the router snapshot and writes it into
  a `<p role="status">` live region, which is how a screen reader learns the page changed at all —
  Angular's router does not announce navigation on its own. A route without a `title` regresses that
  silently, and no gate catches it.
- **Query parameters arrive as `input()` signals**, via `withComponentInputBinding()` in
  `app.config.ts`. They are not bound at construction time, so a value derived from one needs
  `linkedSignal`, not `signal` — `login-page.ts` has the worked example and the reason in a comment.

## Authentication

The API issues a bearer token in a JSON body — it sets no cookie — so the client has to hold it.

- **`SessionStore` keeps it in `localStorage`**, under the key exported by
  `core/identity/access-token-storage-key.ts`. Be honest about the trade-off rather than quiet about
  it: any script on this origin can read that token, so an XSS anywhere in the app or its
  dependencies is a full account takeover. What it buys is a session that survives a reload and a
  second tab. **If the API ever sets an `httpOnly`, `SameSite=Strict` cookie, delete that class
  outright** rather than adapting it — there would be nothing left for it to hold.
- **`accessTokenInterceptor` attaches it** to any `/api/**` request that is not marked `SKIP_AUTH`.
  The opt-out is an `HttpContextToken` set at the **call site** (`{ context: anonymous() }`), never a
  URL list inside the interceptor: distinguishing `POST /api/users` from `GET /api/users/me` means
  re-encoding route knowledge the generated client already owns, somewhere no gate keeps in sync.
  There are exactly two such call sites — register and login — and both live in `IdentityGateway`.
- **On a 401 for a request that carried a token**, the interceptor clears the session and redirects
  to `/login?returnUrl=…`. A failed _login_ is exempt for free, because it was sent anonymously and
  so never reaches that handler — no second status check needed to tell "wrong password" from "your
  token expired".
- **`authGuard` is UX, not security.** It spares the user a page that would only fail. `GET
/api/users/me` is what actually enforces anything, and it would 401 regardless.

`returnUrl` comes from the address bar, so login validates it before navigating: a path on this
origin only. `https://evil.example` and the protocol-relative `//evil.example` are both destinations
the router would otherwise happily honour.

**A successful sign-up logs the new user straight in and lands on `/profile`** — there is no "now
go and log in" step. If that follow-up login fails, the page falls back to
`/login?created=1&email=…`, which `LoginPage` reads to prefill the address and show its
`role="status"` notice. Both halves are easy to miss when changing either page, and anything
driving the app after a sign-up starts already authenticated.

`SessionStore` reads `localStorage` in a **field initialiser**, i.e. during construction. Two
consequences: the class cannot be instantiated where there is no `localStorage` (so it is not
SSR-safe as written), and a spec that touches it needs `localStorage.clear()` in `beforeEach` or
state leaks between tests. It also deliberately registers no `storage` event listener, so logging
out in one tab leaves the others logged in.

## Forms

Signal forms, always. The API is marked `@experimental 21.x` in the installed typings — it can change
in a minor, so keep the surface small and concentrated.

**Render fields with `<app-text-field>`, never a bare `<input>`.** That component
(`ui/text-field/`) is where the `<label for>`, `aria-describedby`, `aria-invalid`, hint and error
markup are wired once and correctly:

```html
<app-text-field
  [field]="f.email"
  name="email"
  label="Email address"
  type="email"
  autocomplete="email"
/>
```

Note the input is `[field]`, not `[formField]` — `[formField]` is the Angular directive, and
`app-text-field` is the only place in this project that uses it. Hand-rolling an `<input
[formField]>` loses the accessible wiring, fails `make lint-accessibility`, and breaks the
acceptance suite, which finds fields by walking `app-text-field` elements. `name`, `label` and
`autocomplete` are required inputs; `name` doubles as the control `id`, and the `-hint` and
`-error` ids derive from it.

Four more things are not obvious from the reference page and were each verified against
`node_modules/@angular/forms/types/`:

- **`<form novalidate>` is mandatory.** The `[formField]` directive writes real `required`,
  `minlength`, `min`, `max` and `disabled` **DOM attributes**. Without `novalidate` the browser's own
  constraint validation swallows the `submit` event and shows its native bubble, so the accessible
  error region never renders. **jsdom does not reproduce this** — unit tests stay green while the real
  page is broken. It is a browser-only failure, which makes it a `claude-in-chrome` review item.
- **Await `ApplicationRef.whenStable()` before focusing a live region.** The alert and status banners
  are always in the DOM with only their content toggled, and `.alert:empty` collapses them to
  `display: none` — which silently refuses focus. `submit()` resolves _before_ change detection has
  rendered the content that un-collapses the banner, so `document.getElementById(…)?.focus()` runs
  against a hidden element and does nothing; the visitor is left on the submit button. `await
this.appRef.whenStable()` first. This is the same class of trap as `novalidate` above and just as
  invisible: **jsdom has no CSS cascade**, so `display: none` is never computed there and no unit
  test can fail on it. `forgot-password-page.ts` and `reset-password-page.ts` do this; `login-page.ts`
  and `sign-up-page.ts` predate the discovery and still focus their alerts without waiting.
- **The directive selector is `[formField]`**, not `[field]`: `<input [formField]="f.email">`, and
  `imports: [FormField]`. This matters when working _inside_ `app-text-field`; everywhere else you
  are passing `[field]` to that component instead, per above.
- **`f.email` is the structural field; `f.email()` is its state.** Flags live on the state:
  `f.email().touched()`, `f.email().errors()`. In templates too — `@if (f.email().invalid())`.
- **Never `null` or `undefined` as an initial field value.** Use `''`, `0`, `[]`.

### Server errors belong on fields

`submit()`'s action returns `Promise<TreeValidationResult>`, so the errors the API returns can be bound
to individual fields. There is **no `customError` export** — a `ValidationError.WithOptionalFieldTree`
is a plain object literal, `{ kind, message, fieldTree? }`. **Omit `fieldTree` to put the error on the
form root**, which is how the `role="alert"` banner gets its content.

`core/http/problem-details.ts` narrows a thrown value to an RFC 9457 document and
`features/identity/server-errors.ts` maps it to those errors. Two rules there:

- **Branch on `type`, never on `detail`.** `detail` is optional per RFC 9457; `type` is always present.
  This is the same convention the acceptance suite already follows.
- **Write the message client-side per `type`; never echo `detail`.** The backend's 409 detail is
  `User already exists with email john@example.com` — phrasing we neither control nor would have chosen.

Two behaviours worth knowing before they surprise you. `errorSummary()` is sorted by
`compareDocumentPosition`, which is what makes "focus the first invalid field" a one-liner rather than a
DOM walk. And submission errors live in a `linkedSignal` sourced on the field's value, so a server error
**clears the moment the user edits that field** — and a root-level error clears on _any_ edit, because
the root's value is the whole model. That is the behaviour you want; if you ever need a banner that
survives typing, it must be a separate component signal, not a root submission error.

## Accessibility

Two requirements, and they are gated, not aspirational:

- **It MUST pass all AXE checks.**
- **It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA
  attributes.**

Three layers enforce as much of that as a machine can, and the third one is you.

### `make lint-accessibility` — axe-core in a real browser

`a11y/accessibility.spec.ts` loads every route in a headless Chromium and runs axe over the rendered
page, failing on any violation tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` or `wcag22aa`.
`best-practice`, AAA and `experimental` rules are deliberately excluded — see the comment on
`wcagAaTags` for why.

**Add your route to `publicRoutes` or `authenticatedRoutes` when you add a page.** A page missing
from both lists is a page nothing checks; it is the one manual step the gate depends on.

The split exists because `/profile` sits behind `authGuard`. Rather than give the audit a real
session — which would make the one gate that needs a browser _also_ need a migrated database and a
seeded user, throwing away the hermeticity every other frontend check has — the authenticated block
seeds a token and stubs the one call the page makes:

- **`page.addInitScript`, not `page.evaluate`.** It has to run before any page script, because
  `SessionStore` reads the token as it is constructed and the guard redirects on the first
  navigation. Writing the key after `goto` is already too late.
- **`page.route('**/api/users/me', …)`** fulfils in the browser, upstream of the dev server's proxy,
  so nothing reaches the backend.
- The key itself is **imported** from `core/identity/access-token-storage-key.ts`, not retyped. That
  module exists, dependency-free, precisely so `a11y/` can import it — which is also why
  `tsconfig.a11y.json` lists it explicitly in `include`.

The trade-off is worth stating: this proves the profile page's _markup_ is accessible, not that any
particular real payload is. And a form's **error state is not reachable by `goto`**, so nothing here
grades it — that belongs to the manual pass below.

It runs in a browser rather than in the Vitest suite for one reason: jsdom has no layout and no CSS
cascade, so axe's `color-contrast` rule can only ever return _incomplete_ there. Contrast is half the
requirement, so the audit has to see real pixels. Don't try to move it into a unit test.

| Path                         |                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `a11y/accessibility.spec.ts` | the audit and its route list                                                    |
| `playwright.config.ts`       | runner config; `baseURL` comes from `A11Y_BASE_URL`, set by Compose             |
| `Dockerfile.a11y`            | the audit's image — the dev server's Node base plus Chromium                    |
| `tsconfig.a11y.json`         | so the editor and `tsc` see these files; the root tsconfig is references-only   |
| `a11y/report/`               | **generated**, gitignored; CI uploads it as the `accessibility-report` artifact |
| `a11y/.output/`              | **generated**, gitignored; Playwright's per-test output (`outputDir`)           |

`a11y/` sits beside `src/`, not inside it — same reasoning as `api/`: it is tooling, not something
Angular compiles or serves. That also keeps it clear of the unit-test builder's spec discovery, so
Vitest and Playwright never fight over a `.spec.ts`. Like the generated client, `a11y/report` is
written by a container running as root and so is root-owned on the host — deleting it needs `sudo`,
or `docker compose run --rm app rm -rf a11y/report`.

Unlike every other target here it needs the app up, so `make lint-accessibility` starts the dev
server itself and waits for its healthcheck. It leaves it running, exactly as
`make run-acceptance-tests` does — `make down` when you are finished.

The audit reaches it on **`http://localhost:4200`**, because the `a11y` service joins the dev
server's own network namespace (`network_mode: service:app`). Don't "simplify" that to the service
name: `http://app:4200` fails twice over. Chromium force-upgrades it to HTTPS — `.app` is an
HSTS-preloaded TLD and the service is named `app` — and reports the mismatch as a thoroughly
misleading `net::ERR_SSL_PROTOCOL_ERROR`. Behind that, Vite's DNS-rebinding defence 403s any `Host`
it doesn't recognise, which would need an `allowedHosts` entry in `angular.json`. localhost is
exempt from both, so neither workaround is needed.

The audit gets its own image so that only this one gate carries a browser; `lint`, `format` and
`run-unit-tests` keep cold-building the plain `node:24-bookworm-slim` one, which matters because
every CI job builds from scratch. The `a11y` service sits behind a Compose profile, so `make up`
ignores it.

That image is **not** `mcr.microsoft.com/playwright`. It is the same Node base as the dev server
plus `npx playwright install --with-deps chromium` — one browser instead of the three that image
ships, and no image tag to keep in step with `package.json`, because `playwright install` fetches
whatever the installed `@playwright/test` pins. Upgrading Playwright is therefore an ordinary
dependency bump. Don't reintroduce the coupling by switching to a prebuilt browser image.

If the audit ever needs a second engine, add it to that `playwright install` line and to
`playwright.config.ts`'s `projects` — but note that axe grades markup and computed style, so a
second engine mostly re-proves the first. Chromium alone is the deliberate default.

> **If the image build dies with `403 … this service is not available in your location`,**
> Playwright's CDN is geo-blocked where you are. Uncomment `PLAYWRIGHT_DOWNLOAD_HOST` in `.env`
> (see `.env.example`) to fetch the same file from a mirror — only the host changes. The default
> stays the official CDN because that is right for CI and for most contributors, and because a
> mirror is a third party in the supply chain; the override is opt-in and local, which is why it
> lives in `.env` rather than in the committed Dockerfile.

### `make lint` — the static layer

`eslint.config.js` extends `angular.configs.templateAccessibility` (ARIA validity, labels,
alternative text, `interactive-supports-focus`, …) and adds `no-positive-tabindex` and
`button-has-type`. This catches in the editor what the audit would otherwise catch minutes later in
a container.

What it looks at is `angular.json`'s `lintFilePatterns`: `src/**/*.ts`, `src/**/*.html` **and
`a11y/**/*.ts`**. The audit's own source is linted along with the app. The generated client is not,
and is excluded on purpose — there is nothing to fix in code no one hand-edits.

### The part no tool checks

Automated rules detect roughly a third of WCAG failures, and **focus management is mostly in the
other two thirds** — axe can see a bad `tabindex`, but not that focus went nowhere. Work through this
by hand during the `frontend-design` critique pass and the `claude-in-chrome` review that skill ends
in, for any UI with state:

- Opening a dialog, menu or drawer moves focus into it; closing it returns focus to the trigger.
- While a modal is open, Tab is trapped inside it and Escape closes it.
- Focus is visible on every interactive element — never `outline: none` without a replacement
  `:focus-visible` style that meets 3:1 against its surroundings.
- Tab order follows reading order, which means DOM order: no CSS reordering that leaves the
  keyboard walking the page sideways.
- A skip link precedes repeated navigation.
- Anything asynchronous that changes the page announces itself (a live region), and errors move
  focus to the first invalid field.

A green `make lint-accessibility` means no _detectable_ violation. It is a floor, not a pass mark.

## Editor / host node_modules

The app needs no host `node_modules` — everything runs in Docker. But an editor needs one on disk
for IntelliSense and type-checking, and it is **separate** from the container's:
`docker-compose.yml` bind-mounts `./:/app` while an anonymous volume (`- /app/node_modules`) shadows
it, so the container keeps the `node_modules` its image built via `npm ci` and never sees the host
copy. The host copy changes only when you install locally.

After the container's dependencies change, sync the host with **`npm ci`**, then restart the
editor's TS/language server:

```bash
npm ci   # installs exactly from package-lock.json and never rewrites it
```

**Never `npm install` for this sync.** `npm ci` installs strictly from `package-lock.json`;
`npm install` rewrites the lockfile as a side effect, and because a host npm version can differ from
the container's, that churns the file for no real change. The committed lockfile is the shared
source of truth and the container's npm owns it (CI installs via `npm ci`). Make **real** dependency
changes inside the container (`make sh` → `npm install`) and commit them — which is exactly how
orval was added — so `npm ci` everywhere stays consistent.

Three frontend-specific wrinkles:

- **Sync with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci`.** Installing `@playwright/test` otherwise
  pulls every browser it pins — hundreds of megabytes the host never uses, since the audit only ever
  runs in `Dockerfile.a11y`'s image. The editor needs Playwright's types, never its browsers. Both
  Dockerfiles set the same variable for the same reason; only the a11y one then installs Chromium
  back, deliberately and alone.
- **orval declares `engines.node >= 22.18`.** A host on an older Node still installs it — npm only
  warns — and the editor only needs orval's types for `orval.config.ts`, which resolve regardless.
  The generator itself always runs in the container, which is on 24.18, so this never bites in
  practice. Don't run `npx orval` on the host to work around it.
- **The generated client is gitignored, so a fresh clone has no `src/app/api`** and the editor will
  flag every import from it as unresolved. `npm ci` does not create it — nothing on the host does.
  Run any container target once (`make run-unit-tests` is the cheapest) and it appears.

This is host-only, for the editor. The container side of the same split — a stale in-container
`node_modules` after a dependency change — is the `--renew-anon-volumes` rebuild described above.

## Angular & TypeScript best practices

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

### TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images — should any arrive. The app currently renders no
  `<img>` at all, so this is a rule for the first one, not a description of existing code.
  - `NgOptimizedImage` does not work for inline base64 images.
- **The app is zoneless because Angular 21 defaults to it**, not because anything configures it.
  There is no `provideZonelessChangeDetection()`, no `zone.js` dependency and no `polyfills` entry
  in `angular.json`, and all three absences are correct. Don't "fix" them in either direction.

### Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

Both are gated — `make lint-accessibility` and `make lint`. See [Accessibility](#accessibility) for
what each layer covers, what neither can, and the route list you have to keep current.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Use **Signal Forms** (`@angular/forms/signals`) for every form — the v21+ default, and what the
  `angular-developer` skill mandates. Do NOT import `FormControl`, `FormGroup`, `FormArray` or
  `FormBuilder`; signal forms replace them and there is no builder. Read
  `.claude/skills/angular-developer/references/signal-forms.md` rather than working from memory.
  See [Forms](#forms) below for the traps that bite immediately — and note that a form field is
  rendered through `<app-text-field>`, not by hand.
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Bridge Observables into signals, not through the async pipe.** This project uses `toSignal` for
  a stream it just reads (`app.ts`) and `rxResource` for a request whose loading and error states
  the template needs (`profile-page.ts`) — which is what `orval.config.ts`'s `retrievalClient`
  choice assumes. There is no `AsyncPipe` in the codebase; don't introduce the first one.
- Do not assume globals like (`new Date()`) are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
