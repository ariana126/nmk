.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh run-unit-tests npm lint fix-lint format fix-format lint-accessibility test-setup test-up test-down

COMPOSE_TEST := docker compose --env-file .env.test -f docker-compose.yml -f docker-compose.test.yml

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

# Both stacks belong to this project, so setup means both env files — the root Makefile only
# ever calls a project's `setup`, and it must not need to know a second one exists.
setup: test-setup ## Create .env and .env.test from their .example files if they don't exist yet
	@[ -f .env ] || cp .env.example .env

up: setup ## Build (if needed) and start the dev + test servers, waiting until they serve
	docker compose up --build -d --wait
	$(COMPOSE_TEST) up --build -d --wait

down: ## Stop and remove the dev + test stack containers
	docker compose down
	$(COMPOSE_TEST) down

restart: down up ## Restart the stack

build: ## Rebuild the image
	docker compose build

logs: ## Tail logs from the container
	docker compose logs -f

ps: ## Show status of the dev + test stack containers
	@docker ps -a --filter name=nmk-frontend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

sh: ## Open a shell in the container
	docker compose exec app bash

run-unit-tests: setup ## Run the Vitest unit tests in a one-off container (no running stack needed)
	docker compose run --rm app npm test

npm: ## Run any package.json script in the container. Usage: make npm test
	docker compose exec app npm run $(filter-out $@,$(MAKECMDGOALS))

lint: setup ## ESLint check (read-only, no changes)
	docker compose run --rm app npm run lint

fix-lint: setup ## ESLint + auto-fix
	docker compose run --rm app npm run lint:fix

format: setup ## Prettier check (read-only, no changes)
	docker compose run --rm app npm run format

fix-format: setup ## Prettier auto-format
	docker compose run --rm app npm run format:fix

# The only check here that needs the app actually running: axe grades a rendered page, which
# is the whole point — jsdom has no layout and no cascade, so it can never decide colour
# contrast. Two recipe lines rather than a `up` prerequisite, so the server is always healthy
# before the audit starts (-j is free to run prerequisites in parallel). The server is left
# running afterwards, like `make run-acceptance-tests` does; `make down` when you are finished.
lint-accessibility: setup ## axe-core accessibility audit against the running app (read-only)
	docker compose up --build -d --wait app
	docker compose run --rm --build a11y npm run lint:accessibility

test-setup: ## Create .env.test from .env.test.example if it doesn't exist yet
	@[ -f .env.test ] || cp .env.test.example .env.test

test-up: setup ## Build (if needed) and start just the test server, waiting until it serves
	$(COMPOSE_TEST) up --build -d --wait

test-down: ## Stop and remove just the test stack's container
	$(COMPOSE_TEST) down

%:
	@:
