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
