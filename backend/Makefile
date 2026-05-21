.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down logs build restart ps install fmt lint type test cov sh worker-logs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Start the full stack (api, worker, mongo, redis, rabbitmq, traefik, mailhog, flower)
	$(COMPOSE) up -d --build

down: ## Stop and remove the stack
	$(COMPOSE) down

logs: ## Tail api logs
	$(COMPOSE) logs -f api

worker-logs: ## Tail celery worker logs
	$(COMPOSE) logs -f worker

ps: ## Show running services
	$(COMPOSE) ps

restart: ## Restart api + worker
	$(COMPOSE) restart api worker

sh: ## Shell into the api container
	$(COMPOSE) exec api bash

install: ## Install deps locally with uv (or pip)
	uv pip install -e ".[dev]" || pip install -e ".[dev]"

fmt: ## Auto-format (black + ruff --fix)
	black app tests
	ruff check --fix app tests

lint: ## Lint & format check (ruff + black --check + mypy)
	ruff check app tests
	black --check app tests
	mypy app

type: ## Type-check only
	mypy app

test: ## Run the test suite
	pytest

cov: ## Run tests with coverage report
	pytest --cov=app --cov-report=html
