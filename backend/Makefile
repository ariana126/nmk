.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh npm reset

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Create .env from .env.example if it doesn't exist yet
	@[ -f .env ] || cp .env.example .env

up: setup ## Build (if needed) and start app + db in the background
	docker compose up --build -d

down: ## Stop and remove the containers
	docker compose down

restart: down up ## Restart the stack

build: ## Rebuild the app image
	docker compose build

logs: ## Tail logs from all containers
	docker compose logs -f

ps: ## Show container status
	docker compose ps

sh: ## Open a shell in the app container
	docker compose exec app bash

npm: ## Run any package.json script in the container. Usage: make npm lint
	docker compose exec app npm run $(filter-out $@,$(MAKECMDGOALS))

reset: ## Stop the stack and wipe the database volume
	docker compose down -v

%:
	@:
