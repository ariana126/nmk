.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

# Subprojects, in start-up order: the acceptance suite talks to a live backend.
# Add `frontend` here once it has a Makefile speaking the same vocabulary.
PROJECTS := backend acceptance-tests

.PHONY: help setup up down restart build ps logs test report migrate reset FORCE

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Run a single project's target with <project>/<target>, e.g. make backend/sh"
	@echo "  Projects: $(PROJECTS)"

setup: ## Create each project's .env from its .env.example
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

migrate: ## Apply Prisma migrations against the running backend
	@$(MAKE) -C backend npm db:migrate

test: ## Run the BDD acceptance suite (requires the stack to be running)
	@$(MAKE) -C acceptance-tests run

report: ## Render the Serenity BDD report from the last run
	@$(MAKE) -C acceptance-tests report

reset: ## Stop everything and wipe the database volume
	@$(MAKE) -C acceptance-tests down
	@$(MAKE) -C backend reset

# Passthrough: `make backend/sh`, `make acceptance-tests/report`, `make backend/ps`, ...
# FORCE keeps these from being mistaken for files, since e.g. acceptance-tests/target exists.
backend/%: FORCE
	@$(MAKE) -C backend $*

acceptance-tests/%: FORCE
	@$(MAKE) -C acceptance-tests $*

FORCE:
