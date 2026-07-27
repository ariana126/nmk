# Frontend

An Angular app, wired into the monorepo like the sibling projects: a `Makefile` speaking the shared
target vocabulary, Docker Compose stacks named `nmk-frontend` and `nmk-frontend-test`, and an entry
in the root Makefile's `PROJECTS` (after `backend`). So the root's fan-out targets reach it
automatically.

Like the backend, it runs as two stacks: the dev server on port 4200 talking to the backend's dev
stack, and a test server on 4201 talking to the backend's **test** stack — which is the one
`make run-acceptance-tests` brings up. They are the same image with a different env file; see
`CLAUDE.md`.

Generated with [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Pages

| Route      |                                                                              |
| ---------- | ---------------------------------------------------------------------------- |
| `/`        | What nmk is, told through the acceptance scenario that proves the flow below |
| `/sign-up` | Create an account, then log straight in and land on the profile              |
| `/login`   | Log in; honours `returnUrl` when the guard sent you here                     |
| `/profile` | The signed-in account, behind `authGuard`                                    |

Sign-up, log-in and log-out are the app's one vertical slice, against the API's `/api/users`,
`/api/auth/login` and `/api/users/me`. `CLAUDE.md` covers how the token is held and attached.

## Commands

Runs in Docker via the Makefile. Prerequisites: Docker, Docker Compose, `make`. From this directory:

```bash
make up                  # build (if needed) and start both servers (4200 and 4201), waiting until they serve
make down                # stop and remove both stacks' containers
make ps                  # status of both stacks' containers
make sh                  # open a shell in the dev stack's container
make run-unit-tests      # run the Vitest unit tests in a throwaway container
make npm <script>        # run any package.json script inside the dev stack's container
make help                # list all available make targets
```

Target the test stack on its own:

```bash
make test-up             # build (if needed) and start just the test server (http://localhost:4201)
make test-down           # stop and remove just the test stack
```

Code-quality checks — the bare targets are read-only; the `fix-` ones write:

```bash
make lint                # ESLint check (read-only, no changes)
make fix-lint            # ESLint + auto-fix
make format              # Prettier check (read-only, no changes)
make fix-format          # Prettier auto-format
```

Each check starts a throwaway container (`docker compose run --rm`) and needs nothing else up.
From the root, `make lint`, `make format`, `make run-unit-tests` and friends fan out here
automatically; a _new kind_ of check would also need a root target, a CI job, and a `run-guardrails`
line (see `../CLAUDE.md`). Make targets are verb-object and hyphenated (`fix-format`); the
package.json scripts they wrap keep the colon (`format:fix`).

## Working with the Angular CLI

The canonical workflow is the `make` targets above — everything runs in the container. To reach the
raw Angular CLI, open a shell with `make sh` (then run `ng …`), or use `make npm <script>` for a
package.json script. The common commands:

### Development server

`ng serve` starts a local dev server on `http://localhost:4200/`, reloading on source changes.
`make up` runs this in the container — twice, once per stack. It forwards `/api` to the backend
through `proxy.conf.mjs`, whose target comes from `API_PROXY_TARGET` in the stack's env file.

### Code scaffolding

`ng generate component component-name` scaffolds a component; `ng generate --help` lists every
available schematic (components, directives, pipes, …).

### Building

`ng build` compiles the project into `dist/`. The production build optimizes for performance by
default.

### Running unit tests

`ng test` executes the unit tests with the [Vitest](https://vitest.dev/) runner (via `make run-unit-tests`).

### Running end-to-end tests

Not from here. The monorepo's end-to-end coverage is the sibling `acceptance-tests` project
(Cucumber + Serenity/JS), run with `make run-acceptance-tests` from the root — which is what the
test stack on 4201 exists to serve. Don't `ng add` a second e2e framework here.

### Additional resources

For detailed command references, see the
[Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
