.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

# Subprojects, in start-up order: the acceptance suite talks to a live backend.
# Add `frontend` here once it has a Makefile speaking the same vocabulary.
PROJECTS := backend acceptance-tests

.PHONY: help setup up down restart build ps logs lint fix-lint format fix-format lint-architecture lint-swagger generate-swagger run-unit-tests run-acceptance-tests run-guardrails fix-violations render-living-documentation open-living-documentation migrate reset FORCE

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Run a single project's target with <project>/<target>, e.g. make backend/sh"
	@echo "  Projects: $(PROJECTS)"

setup: ## Create each project's env files from their .example counterparts
	@for p in $(PROJECTS); do $(MAKE) -C $$p setup || exit $$?; done

up: ## Cold start: build (if needed) and start every project, waiting until the backend is healthy
	@for p in $(PROJECTS); do $(MAKE) -C $$p up || exit $$?; done

down: ## Stop and remove every container
	@for p in $(PROJECTS); do $(MAKE) -C $$p down || exit $$?; done

restart: down up ## Restart everything

build: ## Rebuild every image
	@for p in $(PROJECTS); do $(MAKE) -C $$p build || exit $$?; done

ps: ## Show the status of every container, across all projects
	@docker ps -a --filter name=nmk- --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

logs: ## Tail the backend's logs (the acceptance-tests container idles and logs nothing)
	@$(MAKE) -C backend logs

lint: ## ESLint check across every project (read-only, no changes)
	@for p in $(PROJECTS); do $(MAKE) -C $$p lint || exit $$?; done

fix-lint: ## ESLint + auto-fix across every project
	@for p in $(PROJECTS); do $(MAKE) -C $$p fix-lint || exit $$?; done

format: ## Prettier check across every project (read-only, no changes)
	@for p in $(PROJECTS); do $(MAKE) -C $$p format || exit $$?; done

fix-format: ## Prettier auto-format across every project
	@for p in $(PROJECTS); do $(MAKE) -C $$p fix-format || exit $$?; done

lint-architecture: ## Check the backend's DDD + CQRS layer boundaries
	@$(MAKE) -C backend lint-architecture

lint-swagger: ## Check the backend's committed OpenAPI spec matches the code
	@$(MAKE) -C backend lint-swagger

generate-swagger: ## Regenerate the backend's OpenAPI spec
	@$(MAKE) -C backend generate-swagger

migrate: ## Apply Prisma migrations against the running backend
	@$(MAKE) -C backend npm db:migrate

run-unit-tests: ## Run the backend's Jest unit tests (no running stack needed)
	@$(MAKE) -C backend run-unit-tests

run-acceptance-tests: ## Start the test environment if needed, then run the BDD acceptance suite
	@$(MAKE) -C backend test-up
	@$(MAKE) -C acceptance-tests up
	@$(MAKE) -C acceptance-tests run

# One recipe line per gate, not prerequisites: prerequisites are free to run in parallel
# under -j, and the cheapest-first ordering is the whole point. Make already stops at the
# first failing line, so no `|| exit $$?` is needed.
run-guardrails: ## Run every check CI enforces, cheapest first
	@$(MAKE) format
	@$(MAKE) lint
	@$(MAKE) lint-architecture
	@$(MAKE) lint-swagger
	@$(MAKE) run-unit-tests
	@$(MAKE) run-acceptance-tests

# Recipe lines, not prerequisites, for the same reason as run-guardrails: order matters and
# prerequisites may run in parallel under -j. ESLint embeds Prettier, so fix-lint converges on
# its own and fix-format is a no-op re-check; the spec is generated last, from fixed source.
fix-violations: ## Apply every fix the guardrails would otherwise demand
	@$(MAKE) fix-lint
	@$(MAKE) fix-format
	@$(MAKE) generate-swagger

render-living-documentation: ## Render the living documentation from the last acceptance run
	@$(MAKE) -C acceptance-tests render-living-documentation

open-living-documentation: ## Render the living documentation and open it in the browser
	@$(MAKE) -C acceptance-tests open-living-documentation

reset: ## Stop everything and wipe the database volume
	@$(MAKE) -C acceptance-tests down
	@$(MAKE) -C backend reset

# Passthrough: `make backend/sh`, `make acceptance-tests/run`, `make backend/ps`, ...
# FORCE keeps these from being mistaken for files, since e.g. acceptance-tests/target exists.
backend/%: FORCE
	@$(MAKE) -C backend $*

acceptance-tests/%: FORCE
	@$(MAKE) -C acceptance-tests $*

FORCE:
