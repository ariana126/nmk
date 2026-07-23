---
description: Develop a new feature outside-in — QA writes acceptance tests from the Gherkin, backend implements to green, with a user checkpoint at each architectural layer.
argument-hint: <feature-file-or-area>
---

You are orchestrating an outside-in feature workflow across two subagents:
`qa-engineer` (owns `acceptance-tests/`) and `backend-engineer` (owns
`backend/`). The Gherkin already exists; the goal is executable acceptance tests,
a passing backend implementation, green guardrails, and a reviewed commit.

## How this orchestration works (read first)

- **You are the only one who talks to the user.** Subagents run autonomously and
  cannot pause for approval mid-run — so the "plan → check with user → write"
  checkpoints are *yours* to own, not theirs.
- **Dispatch each agent to plan a layer, then resume it to write.** Launch an
  agent to produce a plan **foreground** (`run_in_background: false`) so you have
  the plan in hand. Relay it to the user. On approval, **resume the same agent
  with `SendMessage`** (its context stays intact) to write that one layer. Never
  start a fresh `Agent` call for the write step — that throws away the plan's
  context.
- **Terminology.** "Business Flow" = the Specification + Domain layers of the
  screenplay model (step-definitions delegating to named, *stubbed* business
  tasks/questions). "Technical layer" = the Integration layer (abilities, HTTP
  interactions, test data). The agents map these explicitly.
- **Never cross project boundaries.** `qa-engineer` never edits backend code or
  `.feature` files; `backend-engineer` never references `acceptance-tests/`.

## Steps

### 1. Guard and read the Gherkin
- If `$ARGUMENTS` is empty, stop and ask the user which `.feature` file/area to
  develop. Do not guess.
- Read the target `.feature` under `acceptance-tests/specs/` to understand the
  scenarios and scope. **Do not edit it** — it is read-only input authored by the
  team.

### 2. QA — Business Flow  *(checkpoint 1)*
- `Agent(qa-engineer, run_in_background: false)`: "Plan the **Business Flow**
  (Specification + Domain) for `$ARGUMENTS`: the step→task mapping and the
  task/question vocabulary, with tasks stubbed. Output the plan only — do NOT
  write any files yet."
- Present the returned plan to the user; incorporate their edits/approval.
- `SendMessage` to that same qa-engineer: "Approved. Write the Business Flow now
  — the step-definitions plus the stubbed business tasks/questions."

### 3. QA — Technical layer
- `SendMessage` to the same qa-engineer: "Now write the **Technical**
  (Integration) layer — abilities, interactions, and test data — so the stubbed
  tasks execute. Typecheck clean. The suite may be red because the backend isn't
  implemented yet, or `@wip` per your rules — that's expected." *(No user
  checkpoint here.)*

### 4. Backend — Domain  *(checkpoint 2)*
- Fresh `Agent(backend-engineer, run_in_background: false)`: "Plan the **domain
  layer only** for the feature described by `$ARGUMENTS` (aggregate, value
  objects, domain events, port interfaces). Output the plan only — do NOT write."
- Present to the user; get approval/edits.
- `SendMessage`: "Approved. Write ONLY the domain layer."

### 5. Backend — Application  *(checkpoint 3)*
- `SendMessage` to the same backend-engineer: "Plan the **application layer
  only** (command/query handlers, read models, application exceptions). Output
  the plan only — do NOT write."
- Present to the user; get approval/edits.
- `SendMessage`: "Approved. Write ONLY the application layer."

### 6. Backend — Infrastructure
- `SendMessage` to the same backend-engineer: "Write the **infrastructure**
  layer to support the approved domain + application — controllers + DTOs,
  repositories + mappers, exception mapper. Regenerate the OpenAPI spec if the
  HTTP surface changed." *(No user checkpoint here.)*

### 7. Green the acceptance suite
- Run `make run-acceptance-tests` from the repo root.
- If red, triage each failure and route it: an **automation bug** goes back to
  `qa-engineer`; a **backend gap** goes back to `backend-engineer` (resume the
  relevant agent with `SendMessage`). Loop until the suite is green.
- `make down` once the suite is green.

### 8. Guardrails
- Run `make fix-violations` to converge auto-fixable issues, then
  `make run-guardrails` — the local mirror of the six CI jobs.
- Report the **actual** output; never claim a pass you didn't run. Fix any
  failure (via the owning agent) and re-run until clean. `make down` after.

### 9. Review and refactor
- Review the full diff of both projects against their skills — `handbook:screenplay-guideline`
  for `acceptance-tests/`, and `handbook:oop-guideline` / `handbook:architecture-guideline` /
  `handbook:test-guideline` for `backend/` (the owning subagents invoke these; you don't).
  Apply improving refactors through the owning agent, then re-run
  `make run-guardrails` to confirm nothing regressed.

### 10. Commit  *(draft → confirm)*
- `git status` and `git diff` to review what will be committed.
- Stage the changes and propose a Conventional Commit message. Show the message
  to the user and commit **only after they confirm**.
- End the commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
