---
description: Develop a feature outside-in — plan the slice, QA automates the Gherkin, backend and frontend implement to green. Normal mode checkpoints the plan and the backend's pure layers; --auto never stops and pushes the commit; --retro records how the run itself went.
argument-hint: <feature-file> [--auto] [--retro] [notes]
---

You orchestrate an outside-in feature workflow across three subagents: `qa-engineer`
(owns `acceptance-tests/`), `backend-engineer` (owns `backend/`) and `frontend-engineer`
(owns `frontend/`). The Gherkin already exists; the goal is executable acceptance tests, a
passing implementation, the UI those tests drive, green guardrails, and a commit.

## How this works (read first)

- **You are the only one who talks to the user.** Subagents run autonomously and cannot pause
  for approval, so every stop below is yours to own, not theirs.
- **One agent per project, resumed with `SendMessage`.** Dispatch each agent once with
  `Agent(run_in_background: false)`; every later instruction to it goes through `SendMessage`
  so its context survives. Never open a second `Agent` call for a project you already
  dispatched — that throws away everything it has built up.
- **Don't make an agent re-derive what you already know.** Step 1 produces the high-level plan;
  every dispatch below quotes the slice of it that agent needs — the scenario names, the
  behaviour, the decisions already made, the user's notes. No agent should be re-opening the
  Gherkin to work out the scope. They still read their own project's CLAUDE.md and invoke their
  own skills; that is their job, not redundancy.
- **Terminology.** "Business Flow" = the Specification + Domain layers of the screenplay model
  (step-definitions delegating to named business tasks/questions). "Technical layer" = the
  Integration layer (abilities, HTTP interactions, test data). "UI slice" = the frontend's
  `core/` layer (gateway + session state) plus its `features/` + `ui/` layer (routed page +
  presentational components).
- **Never cross project boundaries.** `qa-engineer` never edits backend code or `.feature`
  files; `backend-engineer` never references `acceptance-tests/`; `frontend-engineer` stays
  inside `frontend/` and never hand-edits the generated API client.

## Arguments and modes

`$1` is the `.feature` file or area. In the rest of `$ARGUMENTS`:

- **`--auto`**, anywhere, selects auto mode. Strip it before relaying anything.
- **`--retro`**, anywhere, turns on step 9's run retrospective. Strip it too — flags are yours,
  not theirs, and an agent that knows the run is being written up has a reason to report it
  smoothly. It is independent of `--auto`: both, either or neither.
- **Everything else is optional free-form notes** — a constraint or concern to honour, e.g.
  `/develop-feature specs/sign-up.feature --auto consider race conditions on duplicate email`.
  Relay them verbatim into every dispatch on a `User notes:` line; omit the line when empty.

**Normal mode** (the default) stops four times: the step-1 plan, the UI-surface question when
the Gherkin is ambiguous, the backend pure-layers checkpoint, and the commit.

**Auto mode stops for nothing.** At each of those four points, decide and keep going:

| Stop | What auto does instead |
|---|---|
| Step 1 plan | State the plan, proceed straight to step 2. |
| UI surface | A UI-voiced scenario means build the UI; none means API-only. Report which. |
| Backend pure layers | One dispatch that plans **and** writes them, no plan relay. |
| Commit | Stage and commit without confirming, then **push**. |

The one thing auto mode still stops for is an empty `$1` — there is no feature to develop, and
guessing one is worse than asking. Step 6's failure cap applies in both modes.

## Steps

### 1. Understand the feature and plan the slice  *(normal: checkpoint)*
- If `$1` is empty, stop and ask which `.feature` file or area to develop. Do not guess.
- Read the target `.feature` under `acceptance-tests/specs/`. **Do not edit it** — it is
  read-only input authored by the team.
- Get only the grounding the decisions below need: at most the root `CLAUDE.md` and one
  module's. Do not survey the codebase — the owning agents do that inside their own projects.
- Write the **high-level plan**, short and in prose:
  - the business capability in a sentence, and the scenario names, marking which are
    **UI-voiced**;
  - the vertical slice: what QA automates, what the backend's pure layers must model, the HTTP
    surface it implies, the UI scope;
  - the decisions that are expensive to reverse once three agents have built on them — a new
    module or a behaviour on an existing aggregate, the endpoints and their problem types,
    sync or async, what the read model looks like;
  - the risks, and how the user's notes constrain any of the above.
- If no scenario is UI-voiced, resolve the UI surface: **normal mode**, ask the user — a missing
  frontend is more often an oversight than an intent; **auto mode**, call it API-only. Either
  way it is settled here, and step 5 acts on it without asking again.
- **Normal mode: get the plan approved before dispatching anyone.** Auto mode: state it and go.

### 2. QA — Business Flow and Technical layer
One dispatch, no stop in either mode. `Agent(qa-engineer, run_in_background: false)`:

> Automate <scenario names> from `<path>`. <The behaviour, and the API surface from the plan.>
> First the **Business Flow** (Specification + Domain): the step→task mapping and the
> task/question vocabulary. Then the **Technical** (Integration) layer — abilities,
> interactions, test data — so those tasks execute. Typecheck clean. The suite will be red
> until the backend exists, or `@wip` per your rules; that is expected. <User notes: …>

### 3. Backend — domain + application  *(normal: checkpoint)*
- **Normal mode.** `Agent(backend-engineer, run_in_background: false)`: "Plan the **pure
  layers** for <scenario names> — <the behaviour and the decisions from the step-1 plan>.
  Domain: aggregate, value objects, domain events, port interfaces. Application: command/query
  handlers, read models, application exceptions. Output the plan only — do NOT write.
  <User notes: …>" Relay it to the user, take their edits, then `SendMessage`: "Approved. Write
  the domain and application layers. <their edits>"
- **Auto mode.** The same dispatch, one message, ending "…Then write them." — no plan relay.

### 4. Backend — infrastructure
- `SendMessage` to the same agent: "Write the **infrastructure** layer to support the domain +
  application you just wrote — controllers + DTOs, repositories + mappers, exception mapper.
  Regenerate the OpenAPI spec if the HTTP surface changed."

### 5. Frontend — UI slice
- Skip this step if step 1 settled that the feature is API-only, and say so in your report.
- **Sync the contract yourself first**: `make sync-api-contract` from the repo root. The backend
  just regenerated `backend/docs/openapi.json` and the frontend generates its client from its
  own copy. Do not delegate — only the root may name both projects.
- One dispatch, no stop in either mode. `Agent(frontend-engineer, run_in_background: false)`:

  > Build the **UI slice** for <scenario names> — <the behaviour and UI scope from the plan>.
  > The `core/` layer (gateway methods, state) and the `features/` + `ui/` layer (routes, page
  > components, form model, error/empty/loading states, navigation), with co-located specs.
  > Register every new route in `a11y/accessibility.spec.ts`, then run the browser pass on the
  > rendered page. <User notes: …>

### 6. Guardrails
- Run `make fix-violations` to converge auto-fixable issues, then `make run-guardrails` — the
  local mirror of the eight CI jobs. **Do not run `make run-acceptance-tests` separately**:
  `run-guardrails` ends with it, and the blended suite is the most expensive thing here.
- Report the **actual** output; never claim a pass you didn't run.
- Route each failure to its owner by `SendMessage` — an **automation bug** to `qa-engineer`, a
  **backend gap** to `backend-engineer`, a **UI gap** to `frontend-engineer` — and re-run until
  clean. The suite is blended: some examples drive a real browser at the frontend test stack on
  4201, so an acceptance failure is as likely to be a UI one as an HTTP one.
- **If one failure survives three routed fixes, stop and report it** with the output, in both
  modes. Three agents taking turns at a wall is not progress.
- `make down` once green.

### 7. Review and refactor
- Review the full diff of every touched project. The owning agents already applied their own
  skills — `handbook:screenplay-guideline`, `handbook:oop-guideline` /
  `handbook:architecture-guideline` / `handbook:test-guideline`, `angular-developer` /
  `frontend-design:frontend-design` — so you don't invoke them.
- Apply improving refactors through the owning agent. Re-run `make run-guardrails` **only if
  you changed something**, then `make down`.

### 8. Commit
- `git status` and `git diff` to review what will be committed.
- Stage the changes and write a Conventional Commit message, ending with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **Normal mode:** show the message to the user and commit **only after they confirm**. Do not
  push — that is theirs to do.
- **Auto mode:** commit, then `git push` on whatever branch is checked out, `main` included
  (`-u origin <branch>` if it has no upstream). Report the branch and the commit you pushed.

### 9. Run retrospective  *(only with `--retro`)*

Write how the run went to `docs/retros/<YYYY-MM-DD>-<feature>.md`. **If that path already exists,
append `-2`, `-3` — never overwrite.** A second run of the same feature on the same day is usually a
re-run after this file changed, which is exactly the comparison worth keeping; name the run it
supersedes in the metadata table below.

The audience is whoever next edits **this file**, and the subject is these instructions, not the
feature — the diff and the commit message already cover the feature. You are the only witness to the
rest: the diff shows what was built, never what it cost to build.

Because you read this step before step 1, you have known all along that you would be writing it.
Draw on what you actually saw at the time rather than reconstructing a tidy account from the final
state — a plan that was wrong in step 3 and quietly corrected in step 6 leaves no trace in the diff
at all.

#### Run metadata

Open with this table, filled in. It is what makes two retros comparable — a run that hit step 6's
failure cap says something quite different about these instructions depending on what was driving
them.

| Field | Value |
| --- | --- |
| Date | start → end, and the wall-clock span |
| Invoked as | the command verbatim — flags and free-form notes included; `—` for no notes |
| Mode | Normal or Auto |
| Orchestrator model | name and exact ID, e.g. Opus 5 (`claude-opus-5`) |
| Subagent models | per agent, the model and whether it was **inherited or overridden**. The three `.claude/agents/*.md` carry no `model:` frontmatter today, so all three inherit yours — record it anyway; the point of the row is to catch the day that stops being true |
| Claude Code | `claude --version` |
| Branch / commit | the branch and the SHA step 8 produced; add "pushed" in auto mode |
| Feature | the `.feature` path, and how many scenarios it holds |
| Supersedes | the earlier retro this run repeats, or `—` |

Record what you know, not what you can guess. If you passed the `Agent` tool's `model` parameter to
override a subagent, that is the single most load-bearing line on the table.

Record:

- **The shape of the run** — steps run and steps skipped with the reason; the checkpoints you
  stopped at, or what auto mode decided instead.
- **Where the step-1 plan was wrong.** This is the most valuable section. That plan commits three
  agents to endpoints, problem types and a read model before anyone has written a line, so every
  divergence marks a decision the planning step asked you to make too early or with too little.
  Quote what the plan claimed and what turned out to be true.
- **Guardrails.** Each `run-guardrails` round: the check that failed, who you routed it to, whether
  the fix landed. Whether the first pass was green is the single number worth comparing across runs.
- **Friction.** Anything you had to re-explain, a boundary an agent crossed, a dispatch that would
  have gone better worded differently. Name the section of this file each one belongs to — that is
  what makes the retrospective actionable instead of merely true.
- **Cost.** One row per agent and per unattended step, from the figures the `Agent` results and your
  own tool calls give you. A cell you don't have is `—`; do not estimate it.

  | Agent / step | Dispatches | Messages | Tool uses | Tokens | Wall clock |
  | --- | --- | --- | --- | --- | --- |
  | qa-engineer | | | | | |
  | backend-engineer | | | | | |
  | frontend-engineer | | | | | |
  | orchestrator (steps 1, 7) | — | — | | | |
  | guardrails (step 6) | — | — | | | |

  A skipped agent is a `0 | 0 | — | — | —` row, not a missing one — three of these can be empty and
  that shape is itself the finding. Follow the table with a sentence on which step dominated and
  what the largest **avoidable** cost was.

#### Suggested improvements

Close with these — one per friction item worth acting on. Each gives the observation it comes from,
the section of this file it belongs to, and the **concrete change: proposed wording, not a
description of a direction.** A suggestion the reader has to re-derive before applying is not one.

Keep them below and separate from the record, and do not fold them into the friction items. The
record is what you witnessed; a suggestion is your opinion about it, and the reader has to be able
to reject the second without discarding the first. They are proposals — **do not edit this file as
part of the run.** Applying them is the reader's call.

Two habits to resist. **Don't grade the run.** "It went well" is not evidence, nobody can act on
it, and self-assessment drifts generous in exactly the cases worth catching. **Don't write the
record backwards from the suggestion** — settle what you saw before deciding what you'd change, or
the observations quietly arrange themselves behind the fix you already have in mind. A run that
burned three routed fixes and hit the cap is a better artifact than a clean one; don't smooth it.

The file is not part of the feature, which is why this step comes after the commit rather than
before it. `docs/retros/` is gitignored; leave it that way unless you are asked to keep the
records, and then commit them on their own as a `chore(ai-agent):` commit, never folded into the
`feat:`. In auto mode nobody is there to hand it to, so name the path you wrote in your final
report.
