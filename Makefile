.PHONY: install dev-be dev-fe test api up up-db down clean help

help:
	@echo "Keeper Commands:"
	@echo "  make install  - Install frontend (npm) and backend (Maven) dependencies"
	@echo "  make dev-be   - Start the backend on :8080 (needs JWT_SECRET, COOKIE_SECURE=false)"
	@echo "  make dev-fe   - Start the web frontend on :5173"
	@echo "  make test     - Run backend and frontend tests"
	@echo "  make up       - Start all services in Docker"
	@echo "  make up-db    - Start ONLY the database in Docker"
	@echo "  make down     - Stop all Docker containers"
	@echo "  make clean    - Stop containers and wipe the database"

install:
	cd frontend && npm install
	cd backend && ./mvnw clean install -DskipTests

dev-be:
	cd backend && MICRONAUT_ENVIRONMENTS=dev ./mvnw mn:run

dev-fe:
	cd frontend && npm run dev

test:
	cd backend && ./mvnw verify
	cd frontend && npm test

up:
	docker-compose up -d

up-db:
	docker-compose up -d db

down:
	docker-compose down

clean:
	docker-compose down -v --remove-orphans
