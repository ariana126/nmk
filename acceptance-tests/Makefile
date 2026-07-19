.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh run report npm lint fix-lint format fix-format

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Create .env from .env.example if it doesn't exist yet
	@[ -f .env ] || cp .env.example .env

up: setup ## Build (if needed) and start the container in the background
	docker compose up --build -d

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

run: ## Run the BDD acceptance suite (requires the backend stack to be running)
	docker compose exec app npm test

report: ## Render the Serenity BDD report from the last run into target/site/serenity
	docker compose exec app npm run report

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

%:
	@:
