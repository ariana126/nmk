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

Everything runs in Docker via the `Makefile` — a single `app` service defined in `docker-compose.yml`
(Compose project `nmk-frontend`), built from the `Dockerfile` (`node:22-bookworm-slim`). The Makefile
speaks the monorepo's shared vocabulary, so the root Makefile's fan-out targets reach it:

- `make up` / `make down` — start/stop the dev server (`ng serve`, http://localhost:4200), `up` waits until it serves.
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

## The API client is generated — never hand-write it

HTTP services and their models are generated from an OpenAPI contract by
[orval](https://orval.dev) (`client: 'angular'`). Do not write a service that calls `HttpClient`
against the API by hand, and do not edit anything under `src/app/api` — the next command overwrites it.

| Path               |                                     |                                      |
| ------------------ | ----------------------------------- | ------------------------------------ |
| `api/openapi.json` | the contract                        | committed, but **not** hand-editable |
| `orval.config.ts`  | the generator config                | committed                            |
| `src/app/api/`     | `<tag>/<tag>.service.ts` + `model/` | **generated, gitignored**            |

`api/` sits beside `src/`, not inside it, because the spec is an input to the build rather than
something TypeScript compiles or Angular serves — `tsconfig.app.json` includes only `src/**/*.ts`,
and `angular.json`'s asset glob covers only `public/`.

**You never run the generator explicitly.** `npm run generate:api` is wired to npm's `prestart`,
`prebuild`, `pretest`, `prelint` and `prelint:fix` hooks, so `make up`, `make run-unit-tests`,
`make lint` and `make fix-lint` each rebuild the client from the committed spec first. That is why
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
  generated code. When one is needed, the sanctioned mechanism is `ng generate environments`
  (build-time `environment.apiUrl` + `fileReplacements`), not a string in the generator config.

Authentication is _not_ generated. The contract's `bearer` scheme belongs in a functional
`HttpInterceptorFn` registered as `provideHttpClient(withInterceptors([...]))` in `app.config.ts`,
not threaded through every generated call.

### Testing against it

Generated code is not worth testing; the code that _calls_ it is. In `TestBed`, provide
`provideHttpClient()` **and** `provideHttpClientTesting()`, then assert requests through
`HttpTestingController`. Per `references/testing-fundamentals.md`, this project is zoneless: never
`fixture.detectChanges()` — Act, then `await fixture.whenStable()`, then assert, which is the shape
`src/app/app.spec.ts` already uses.

> `references/creating-services.md` in the vendored skill tells you to write `@Service()`. **That
> decorator does not exist in the installed `@angular/core` 21.2.x** — only `Injectable` is
> declared. Ignore that page's decorator advice.

Like `.angular/cache`, the generated tree is written by a container running as root, so it is
root-owned on the host: `git clean` and `rm -rf` need `sudo`, or run them through
`docker compose run --rm app`.

**If `make up` dies with `orval: not found`,** the long-lived container is reusing an anonymous
`node_modules` volume created before orval was installed — `docker compose run --rm` builds a fresh
one every time and so never shows the problem. Rebuild once with
`docker compose up --build -d --renew-anon-volumes`. This is the same stale-anonymous-volume trap
described for the backend's Prisma client, and it bites after any dependency change; a fresh clone
and CI are unaffected.

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

**Add your route to `auditedRoutes` when you add a page.** A page missing from that list is a page
nothing checks; it is the one manual step the gate depends on.

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
`run-unit-tests` keep cold-building the plain `node:22-bookworm-slim` one, which matters because
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
- **orval declares `engines.node >= 22.18`.** A host on an older 22.x still installs it — npm only
  warns — and the editor only needs orval's types for `orval.config.ts`, which resolve regardless.
  The generator itself always runs in the container, which is on 22.23, so this never bites in
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
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

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
- Prefer Reactive forms instead of Template-driven ones
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
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
