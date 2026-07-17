.PHONY: install dev-be dev-fe dev-mobile api up up-db down clean help

help:
	@echo "Keeper Commands:"
	@echo "  make install    - Install all dependencies (NPM + Maven)"
	@echo "  make dev-be     - Start Backend (runs tests first)"
	@echo "  make dev-fe     - Start Web Frontend"
	@echo "  make dev-mobile - Start Mobile App"
	@echo "  make api        - Generate API Client"
	@echo "  make up         - Start all services in Docker"
	@echo "  make up-db      - Start ONLY Database in Docker"
	@echo "  make down       - Stop all Docker containers"
	@echo "  make clean      - Stop containers and wipe database"

install:
	npm install
	cd backend && ./mvnw clean install

dev-be:
	cd backend && ./mvnw test && MICRONAUT_ENVIRONMENTS=dev ./mvnw mn:run

dev-fe:
	npm run dev --workspace=web

dev-mobile:
	cd apps/mobile && npm run start

api:
	cd backend && ./mvnw clean compile
	cd frontend-shared/api-client && npm run generate

up:
	docker-compose up -d

up-db:
	docker-compose up -d db

down:
	docker-compose down

clean:
	docker-compose down -v --remove-orphans
