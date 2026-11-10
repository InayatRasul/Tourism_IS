.PHONY: up down reset-db logs ps psql be-test be-run fe-install fe-dev fe-build

up:            ## build and start all services
	docker compose up -d --build

down:          ## stop services
	docker compose down

reset-db:      ## stop services and DELETE the database volume (re-runs migrations + seed)
	docker compose down -v

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

psql:          ## open interactive PostgreSQL shell inside the db container
	docker compose exec db psql -U tis -d tis

be-test:       ## Go unit tests
	cd backend && go vet ./... && go test ./...

be-run:        ## run backend locally against the dockerised db
	cd backend && set -a && . ../.env && set +a && \
	DATABASE_URL=postgres://tis:tis@localhost:5432/tis?sslmode=disable go run ./cmd/api

fe-install:    ## install frontend deps (inside Docker, no local node needed)
	docker run --rm -u $$(id -u):$$(id -g) -v "$$PWD/frontend":/app -w /app node:22-alpine npm install

fe-dev:        ## vite dev server (needs local node)
	cd frontend && npm run dev

fe-build:      ## type-check + build frontend inside Docker
	docker run --rm -u $$(id -u):$$(id -g) -v "$$PWD/frontend":/app -w /app node:22-alpine sh -c "npm ci && npm run build"
