# Frontend

Not started yet — this directory is a placeholder. No code, no Makefile, and no entry in the root
Makefile's `PROJECTS`, so the root targets skip it entirely.

## Adding it

The root Makefile holds no logic of its own: it delegates to each subproject's Makefile and expects
them all to speak the same vocabulary. To join, this project needs:

1. **A Makefile** implementing the shared targets — at minimum `setup`, `up`, `down`, `build`, `ps`,
   `logs`, `lint`, `fix-lint`, `format`, `fix-format`, and a `help` listing them. Follow
   `../backend/Makefile` or `../acceptance-tests/Makefile`; the bare check targets must stay
   read-only, with the `fix-` variants doing the writing.
2. **A Docker Compose stack** named `nmk-frontend`, with a committed `.env.example` that `setup`
   copies to `.env`. Every check should run in a throwaway container and need nothing else up — that
   is what lets CI run each gate with no Node setup and no secrets.
3. **A line in the root Makefile's `PROJECTS`**, placed *after* `backend` if it talks to the backend.
   That list is in start-up order.

Once those exist, `make lint`, `make format` and friends fan out to this project automatically, and
CI covers it with no workflow change. A *new kind* of check — one no existing root target runs —
also needs a root target, a CI job calling it, and a line in `run-guardrails`. See `../CLAUDE.md`.


The rest of the file is what angular cli generated:


# NmkFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
