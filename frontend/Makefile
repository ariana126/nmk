.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh run-unit-tests npm lint fix-lint format fix-format

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

setup: ## Create .env from .env.example if it doesn't exist yet
	@[ -f .env ] || cp .env.example .env

up: setup ## Build (if needed) and start the dev server in the background, waiting until it serves
	docker compose up --build -d --wait

down: ## Stop and remove the container
	docker compose down

restart: down up ## Restart the stack

build: ## Rebuild the image
	docker compose build

logs: ## Tail logs from the container
	docker compose logs -f

ps: ## Show container status
	docker compose ps

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

%:
	@:
