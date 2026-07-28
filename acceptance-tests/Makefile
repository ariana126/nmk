.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs ps sh run render-living-documentation open-living-documentation npm lint fix-lint format fix-format

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

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

run: ## Run the BDD acceptance suite (requires the backend and frontend test stacks to be running)
	docker compose exec app npm test

render-living-documentation: ## Render the living documentation from the last run into target/site/serenity
	docker compose exec app npm run report

# The only target that runs on the host rather than in a container: a browser can't be
# launched from inside one. target/ is bind-mounted, so the rendered site is right there.
# A recipe line, not a prerequisite, so rendering always finishes before opening (-j would
# be free to run prerequisites in parallel).
open-living-documentation: ## Render the living documentation and open it in the browser
	@$(MAKE) render-living-documentation
	@(xdg-open target/site/serenity/index.html || open target/site/serenity/index.html) >/dev/null 2>&1

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
