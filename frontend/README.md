# Frontend

An Angular app, wired into the monorepo like the sibling projects: a `Makefile` speaking the shared
target vocabulary, a Docker Compose stack named `nmk-frontend`, and an entry in the root Makefile's
`PROJECTS` (after `backend`). So the root's fan-out targets reach it automatically.

Generated with [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Commands

Runs in Docker via the Makefile. Prerequisites: Docker, Docker Compose, `make`. From this directory:

```bash
make up                  # build (if needed) and start the dev server (http://localhost:4200), waiting until it serves
make down                # stop and remove the container
make sh                  # open a shell in the container
make run-unit-tests      # run the Vitest unit tests in a throwaway container
make npm <script>        # run any package.json script inside the container
make help                # list all available make targets
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
`make up` runs this in the container.

### Code scaffolding

`ng generate component component-name` scaffolds a component; `ng generate --help` lists every
available schematic (components, directives, pipes, …).

### Building

`ng build` compiles the project into `dist/`. The production build optimizes for performance by
default.

### Running unit tests

`ng test` executes the unit tests with the [Vitest](https://vitest.dev/) runner (via `make run-unit-tests`).

### Running end-to-end tests

`ng e2e` runs end-to-end tests. Angular CLI ships no e2e framework by default — choose one that suits
your needs.

### Additional resources

For detailed command references, see the
[Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
