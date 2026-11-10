.PHONY: up down reset-db logs ps psql test be-test be-test-integration be-run fe-install fe-dev fe-build fe-test

up:                  ## build and start all services
	docker compose up -d --build

down:                ## stop services
	docker compose down

reset-db:            ## stop services and DELETE the database volume (re-runs migrations + seed)
	docker compose down -v

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

psql:                ## open interactive PostgreSQL shell inside the db container
	docker compose exec db psql -U tis -d tis

test: be-test be-test-integration fe-test ## run all backend unit, DB integration, and frontend tests

be-test:             ## Go unit tests
	cd backend && go vet ./... && go test -v ./...

be-test-integration: ## Go integration tests against PostgreSQL (tis_test database)
	docker compose exec -T db psql -U tis -d tis -tc "SELECT 1 FROM pg_database WHERE datname='tis_test'" | grep -q 1 || \
		docker compose exec -T db psql -U tis -d tis -c "CREATE DATABASE tis_test;"
	cd backend && TEST_DATABASE_URL="postgres://tis:tis@localhost:5432/tis_test?sslmode=disable" \
		go test -tags=integration -count=1 -v ./internal/integration/...

be-run:              ## run backend locally against the dockerised db
	cd backend && set -a && . ../.env && set +a && \
	DATABASE_URL=postgres://tis:tis@localhost:5432/tis?sslmode=disable go run ./cmd/api

fe-install:          ## install frontend deps (inside Docker, no local node needed)
	docker run --rm -v "$$PWD/frontend":/app -w /app node:22-alpine npm install

fe-dev:              ## vite dev server (needs local node)
	cd frontend && npm run dev

fe-build:            ## type-check + build frontend inside Docker
	docker run --rm -v "$$PWD/frontend":/app -w /app node:22-alpine sh -c "npm install && npm run build"

fe-test:             ## run frontend Vitest unit & component tests inside Docker
	docker run --rm -v "$$PWD/frontend":/app -w /app node:22-alpine sh -c "npm install --silent && npm test"
