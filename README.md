# Nmk

A starter template for building reliable, scalable, and maintainable applications fast — by delegating implementation to AI agents while keeping humans in the loop for validation and review.

---

## Philosophy

### 1. AI Implements, Humans Validate

The core workflow: AI agents handle implementation; humans own the validation gate. This separation keeps AI productivity high while ensuring quality through deliberate human review at each checkpoint.

### 2. Software Has Two Values

From *Clean Architecture* by Robert C. Martin:

> Software has two values: **functionality** and **structure**. What makes software *soft* — adaptable and changeable — is its structure, not its functionality.

Hardware is hard because you cannot change it cheaply. Software must remain soft. Both values must be continuously validated.

---

## The Validation Layer

The validation layer is the heart of this project. It ensures AI-generated code meets the bar on both dimensions above.

### Functional Validation

Does it do the right thing?

Two layers. **Unit tests** (`make run-unit-tests`) cover domain logic in isolation — no database, no
framework. **Acceptance tests** (`make run-acceptance-tests`) are black-box BDD scenarios written in
business language, driving the API over HTTP exactly as a client would; they know nothing about the
implementation, so they keep validating behaviour through a rewrite of it.

That suite doubles as documentation. Every run renders **living documentation** — a browsable site
generated from the scenarios that actually ran — published to GitHub Pages on each push to `main`.
It cannot drift from the code, because it *is* the test results.

### Structural Validation

Does it stay soft?

Four automated checks, because structure erodes silently and no human review catches it reliably at
AI's rate of change. `make format` and `make lint` hold style and code quality.
`make lint-architecture` enforces the DDD + CQRS layer boundaries as machine-checkable rules — the
domain may not import the framework, the application may not reach into infrastructure, modules may
not import each other. `make lint-swagger` catches the committed API spec drifting from the code.

Every check runs in CI as its own job, so a violation names itself. Locally,
`make run-guardrails` runs all six gates cheapest-first, and `make fix-violations` applies every fix
they would demand.