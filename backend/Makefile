.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh npm lint fix-lint format fix-format lint-architecture reset test-setup test-up test-down test-reset

COMPOSE_TEST := docker compose --env-file .env.test -f docker-compose.yml -f docker-compose.test.yml

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Create .env from .env.example if it doesn't exist yet
	@[ -f .env ] || cp .env.example .env

up: setup test-setup ## Build (if needed) and start the dev + test stacks, waiting until healthy
	docker compose up --build -d --wait
	$(COMPOSE_TEST) up --build -d --wait

down: ## Stop and remove the dev + test stack containers
	docker compose down
	$(COMPOSE_TEST) down

restart: down up ## Restart the stack

build: ## Rebuild the app image
	docker compose build

logs: ## Tail logs from all containers
	docker compose logs -f

ps: ## Show status of the dev + test stack containers
	@docker ps -a --filter name=nmk-backend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

sh: ## Open a shell in the app container
	docker compose exec app bash

npm: ## Run any package.json script in the container. Usage: make npm test
	docker compose exec app npm run $(filter-out $@,$(MAKECMDGOALS))

lint: ## ESLint check (read-only, no changes)
	docker compose exec app npm run lint

fix-lint: ## ESLint + auto-fix
	docker compose exec app npm run lint:fix

format: ## Prettier check (read-only, no changes)
	docker compose exec app npm run format

fix-format: ## Prettier auto-format
	docker compose exec app npm run format:fix

lint-architecture: ## Check the DDD + CQRS layer boundaries (dependency-cruiser)
	docker compose exec app npm run depcruise

reset: ## Stop the dev + test stacks and wipe their database volumes
	docker compose down -v
	$(COMPOSE_TEST) down -v

test-setup: ## Create .env.test from .env.test.example if it doesn't exist yet
	@[ -f .env.test ] || cp .env.test.example .env.test

test-up: test-setup ## Build (if needed) and start the test stack (NODE_ENV=test), waiting until healthy
	$(COMPOSE_TEST) up --build -d --wait

test-down: ## Stop and remove the test stack containers
	$(COMPOSE_TEST) down

test-reset: ## Stop the test stack and wipe its database volume
	$(COMPOSE_TEST) down -v

%:
	@:
