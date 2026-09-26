#=============================================================================
# CBT - MAKEFILE
#=============================================================================
# Automation commands untuk seluruh project.
#
# CARA PENGGUNAAN:
#   make <command>
#
# CONTOH:
#   make help        - Tampilkan semua perintah
#   make setup       - Setup awal project
#   make infra-up    - Start infrastructure
#   make dev-fe-tu   - Start SIAKAD TU dev server
#   make dev-be      - Start TU-Core dev server
#=============================================================================

#=============================================================================
# OS DETECTION
#=============================================================================
ifdef COMSPEC
    IS_WINDOWS := 1
else
    IS_WINDOWS := 0
endif

#=============================================================================
# COLOR & EMOJI SUPPORT
#=============================================================================
ifdef COLOR
    USE_COLOR := $(COLOR)
else ifeq ($(IS_WINDOWS),1)
    USE_COLOR := 0
else
    USE_COLOR := 1
endif

ifdef EMOJI
    USE_EMOJI := $(EMOJI)
else ifeq ($(IS_WINDOWS),1)
    USE_EMOJI := 0
else
    USE_EMOJI := 1
endif

ifeq ($(USE_COLOR),1)
    E := echo
else
    E := echo -e
endif

ifeq ($(USE_COLOR),0)
    GREEN := \033[0;32m
    YELLOW := \033[1;33m
    RED := \033[0;31m
    BLUE := \033[0;34m
    CYAN := \033[0;36m
    BOLD := \033[1m
    NC := \033[0m
else
    GREEN :=
    YELLOW :=
    RED :=
    BLUE :=
    CYAN :=
    BOLD :=
    NC :=
endif

ifeq ($(USE_EMOJI),1)
    I_OK := ✅
    I_WARN := ⚠️
    I_ERR := ❌
    I_SETUP := 🚀
    I_FE := 🎨
    I_BE := ⚙️
    I_DB := 🗄️
else
    I_OK := [OK]
    I_WARN := [!!]
    I_ERR := [XX]
    I_SETUP := [>>]
    I_FE := [FE]
    I_BE := [BE]
    I_DB := [DB]
endif

#=============================================================================
# PROJECT VARIABLES
#=============================================================================
ROOT_DIR := $(CURDIR)
APPS_DIR := $(ROOT_DIR)/apps
SERVICES_DIR := $(ROOT_DIR)/services
SCRIPTS_DIR := $(ROOT_DIR)/scripts

# DIPERBAIKI: Hanya service yang benar-benar ada
FE_APPS := web-sekolah siakad-guru siakad-tu psb
BE_SERVICES := edge-bff tu-core

DOCKER_COMPOSE := docker-compose

#=============================================================================
# DEFAULT TARGET
#=============================================================================
.DEFAULT_GOAL := help

#=============================================================================
# HELP
#=============================================================================
.PHONY: help
help:
	@$(E) ""
	@$(E) "$(BLUE)CBT - AUTOMATION COMMANDS$(NC)"
	@$(E) ""
	@$(E) "$(GREEN)SETUP & INFRASTRUCTURE$(NC)"
	@$(E) "  make setup           Setup awal project (install deps + start infra)"
	@$(E) "  make infra-up        Start infrastructure (PostgreSQL, Redis, MinIO, NATS)"
	@$(E) "  make infra-down      Stop infrastructure"
	@$(E) "  make infra-restart   Restart infrastructure"
	@$(E) "  make infra-logs      View infrastructure logs"
	@$(E) "  make infra-status    Check infrastructure status"
	@$(E) "  make infra-reset     Reset infrastructure (hapus semua data!)"
	@$(E) ""
	@$(E) "$(GREEN)FRONTEND DEVELOPMENT$(NC)"
	@$(E) "  make dev-fe-tu       Start SIAKAD TU dev server"
	@$(E) "  make dev-fe-guru     Start SIAKAD Guru dev server"
	@$(E) "  make dev-fe-web      Start Website Sekolah dev server"
	@$(E) "  make dev-fe-psb      Start PSB dev server"
	@$(E) ""
	@$(E) "$(GREEN)BACKEND DEVELOPMENT$(NC)"
	@$(E) "  make dev-be          Start TU-Core dev server"
	@$(E) "  make dev-be-edge     Start Edge BFF dev server"
	@$(E) ""
	@$(E) "$(GREEN)DATABASE$(NC)"
	@$(E) "  make db-connect      Connect ke PostgreSQL"
	@$(E) "  make db-seed         Seed database dengan sample data"
	@$(E) "  make db-reset        Reset database (hapus semua data!)"
	@$(E) ""
	@$(E) "$(GREEN)BUILD & TEST$(NC)"
	@$(E) "  make build-be        Build semua backend services"
	@$(E) "  make test-be         Test semua backend services"
	@$(E) ""

#=============================================================================
# SETUP & INFRASTRUCTURE
#=============================================================================
.PHONY: setup
setup:
	@$(E) ""
	@$(E) "$(BLUE)$(BOX_TOP)$(NC)"
	@$(E) "$(BLUE)$(BOX_V) $(BOLD)SETUP CBT$(NC)$(BLUE)$(BOX_V)$(NC)"
	@$(E) "$(BLUE)$(BOX_BOT)$(NC)"
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Checking prerequisites...$(NC)"
	@command -v docker >/dev/null 2>&1 || { $(E) "$(RED)$(I_ERR) Docker is not installed$(NC)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { $(E) "$(RED)$(I_ERR) Node.js is not installed$(NC)"; exit 1; }
	@command -v go >/dev/null 2>&1 || { $(E) "$(RED)$(I_ERR) Go is not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { $(E) "$(RED)$(I_ERR) NPM is not installed$(NC)"; exit 1; }
	@$(E) "$(GREEN)$(I_OK) All prerequisites met$(NC)"
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Setting up environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		$(E) "$(GREEN)$(I_OK) .env created from template$(NC)"; \
	else \
		$(E) "$(YELLOW)$(I_WARN) .env already exists, skipping$(NC)"; \
	fi
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Starting infrastructure...$(NC)"
	@$(DOCKER_COMPOSE) up -d
	@$(E) ""
	@$(E) "$(BLUE)$(I_WAIT) Waiting for services to be healthy...$(NC)"
	@sleep 10
	@$(DOCKER_COMPOSE) ps
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Installing frontend dependencies...$(NC)"
	@for app in $(FE_APPS); do \
		if [ -d "$(APPS_DIR)/$$app" ]; then \
			$(E) "$(CYAN)  Installing $$app...$(NC)"; \
			cd $(APPS_DIR)/$$app && yarn install --frozen-lockfile 2>/dev/null || yarn install; \
			cd $(ROOT_DIR); \
		fi; \
	done
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Downloading backend dependencies...$(NC)"
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service" ]; then \
			$(E) "$(CYAN)  Downloading $$service...$(NC)"; \
			cd $(SERVICES_DIR)/$$service && go mod download 2>/dev/null || true; \
			cd $(ROOT_DIR); \
		fi; \
	done
	@$(E) ""
	@$(E) "$(BLUE)$(I_LIST) Initializing database schema...$(NC)"
	@$(DOCKER_COMPOSE) exec -T postgres psql -U $${POSTGRES_USER:-smk_dev} -d $${POSTGRES_DB:-smk_platform} < $(SCRIPTS_DIR)/init-db/001-init-schema.sql 2>/dev/null || \
		$(E) "$(YELLOW)$(I_WARN) Seed script not found or already applied$(NC)"
	@$(E) "$(GREEN)$(I_OK) Database seeded$(NC)"
	@$(E) ""
	@$(E) "$(GREEN)$(BOX_TOP)$(NC)"
	@$(E) "$(GREEN)$(BOX_V) $(I_OK) SETUP COMPLETE!$(GREEN)$(BOX_V)$(NC)"
	@$(E) "$(GREEN)$(BOX_BOT)$(NC)"
	@$(E) ""
	@$(E) "Next steps:"
	@$(E) "  1. Edit .env file if needed"
	@$(E) "  2. Run 'make dev-fe-tu' to start SIAKAD TU"
	@$(E) "  3. Run 'make dev-be' to start TU-Core"
	@$(E) ""

.PHONY: infra-up
infra-up:
	@$(E) "$(GREEN)$(I_SETUP) Starting infrastructure...$(NC)"
	@$(DOCKER_COMPOSE) up -d
	@$(E) "$(GREEN)$(I_OK) Infrastructure started$(NC)"
	@$(DOCKER_COMPOSE) ps

.PHONY: infra-down
infra-down:
	@$(E) "$(YELLOW)Stopping infrastructure...$(NC)"
	@$(DOCKER_COMPOSE) down
	@$(E) "$(GREEN)$(I_OK) Infrastructure stopped$(NC)"

.PHONY: infra-restart
infra-restart:
	@$(E) "$(YELLOW)Restarting infrastructure...$(NC)"
	@$(DOCKER_COMPOSE) restart
	@$(E) "$(GREEN)$(I_OK) Infrastructure restarted$(NC)"
	@$(DOCKER_COMPOSE) ps

.PHONY: infra-logs
infra-logs:
	@$(DOCKER_COMPOSE) logs -f

.PHONY: infra-status
infra-status:
	@$(E) "$(BLUE)Infrastructure Status:$(NC)"
	@$(E) ""
	@$(DOCKER_COMPOSE) ps
	@$(E) ""
	@$(E) "$(BLUE)Health Checks:$(NC)"
	@$(E) -n "  PostgreSQL: "
	@docker inspect --format='{{.State.Health.Status}}' smk-postgres 2>/dev/null || echo "not running"
	@$(E) -n "  Redis:      "
	@docker inspect --format='{{.State.Health.Status}}' smk-redis 2>/dev/null || echo "not running"
	@$(E) -n "  MinIO:      "
	@docker inspect --format='{{.State.Health.Status}}' smk-minio 2>/dev/null || echo "not running"
	@$(E) -n "  NATS:       "
	@docker inspect --format='{{.State.Health.Status}}' smk-nats 2>/dev/null || echo "not running"

.PHONY: infra-reset
infra-reset:
	@$(E) "$(RED)$(I_WARN) WARNING: This will delete ALL data!$(NC)"
	@$(E) -n "Are you sure? (y/N): "
	@read confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(E) "$(YELLOW)Resetting infrastructure...$(NC)"; \
		$(DOCKER_COMPOSE) down -v --remove-orphans; \
		$(DOCKER_COMPOSE) up -d; \
		$(E) "$(GREEN)$(I_OK) Infrastructure reset complete$(NC)"; \
	else \
		$(E) "$(GREEN)$(I_OK) Cancelled$(NC)"; \
	fi

#=============================================================================
# FRONTEND DEVELOPMENT
#=============================================================================
.PHONY: dev-fe-tu
dev-fe-tu:
	@$(E) "$(GREEN)$(I_FE) Starting SIAKAD TU...$(NC)"
	@cd $(APPS_DIR)/siakad-tu && yarn dev

.PHONY: dev-fe-guru
dev-fe-guru:
	@$(E) "$(GREEN)$(I_FE) Starting SIAKAD Guru...$(NC)"
	@cd $(APPS_DIR)/siakad-guru && yarn dev

.PHONY: dev-fe-web
dev-fe-web:
	@$(E) "$(GREEN)$(I_FE) Starting Website Sekolah...$(NC)"
	@cd $(APPS_DIR)/web-sekolah && yarn dev

.PHONY: dev-fe-psb
dev-fe-psb:
	@$(E) "$(GREEN)$(I_FE) Starting PSB...$(NC)"
	@cd $(APPS_DIR)/psb && yarn dev

#=============================================================================
# BACKEND DEVELOPMENT
#=============================================================================
.PHONY: dev-be
dev-be:
	@$(E) "$(GREEN)$(I_BE) Starting TU-Core...$(NC)"
	@cd $(SERVICES_DIR)/tu-core && go run ./cmd/main.go

.PHONY: dev-be-edge
dev-be-edge:
	@$(E) "$(GREEN)$(I_BE) Starting Edge BFF...$(NC)"
	@cd $(SERVICES_DIR)/edge-bff && go run ./cmd/main.go

.PHONY: build-be
build-be:
	@$(E) "$(GREEN)Building all backend services...$(NC)"
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service" ]; then \
			$(E) "$(CYAN)  Building $$service...$(NC)"; \
			cd $(SERVICES_DIR)/$$service && \
			CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/$$service ./cmd/main.go; \
			cd $(ROOT_DIR); \
		fi; \
	done
	@$(E) "$(GREEN)$(I_OK) All backend services built$(NC)"

.PHONY: test-be
test-be:
	@$(E) "$(GREEN)Testing all backend services...$(NC)"
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service" ]; then \
			$(E) "$(CYAN)  Testing $$service...$(NC)"; \
			cd $(SERVICES_DIR)/$$service && go test -v -race ./...; \
			cd $(ROOT_DIR); \
		fi; \
	done
	@$(E) "$(GREEN)$(I_OK) All backend tests passed$(NC)"

#=============================================================================
# DATABASE
#=============================================================================
# Hardcode nilai database (sesuai .env)
DB_USER := -smk_dev
DB_NAME := -smk_platform
DB_PASSWORD := -secret123
DB_HOST := localhost
DB_PORT := 5432
.PHONY: db-connect
db-connect:
	@$(E) "$(GREEN)$(I_DB) Connecting to PostgreSQL...$(NC)"
	@docker exec -it smk-postgres psql -U $(DB_USER) -d $(DB_NAME)

.PHONY: db-seed
db-seed:
	@$(E) "$(GREEN)$(I_SEED) Seeding database...$(NC)"
	@docker exec -i smk-postgres psql -U $(DB_USER) -d $(DB_NAME) < $(SCRIPTS_DIR)/init-db/001-init-schema.sql
	@$(E) "$(GREEN)$(I_OK) Database seeded$(NC)"

.PHONY: db-reset
db-reset:
	@$(E) "$(RED)$(I_WARN) WARNING: This will delete ALL database data!$(NC)"
	@$(E) -n "Are you sure? (y/N): "
	@read confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(E) "$(YELLOW)$(I_DEL) Resetting database...$(NC)"; \
		docker exec -i smk-postgres psql -U $(DB_USER) -d $(DB_NAME) \
			-c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; \
		$(MAKE) db-seed; \
		$(E) "$(GREEN)$(I_OK) Database reset complete$(NC)"; \
	else \
		$(E) "$(GREEN)$(I_OK) Cancelled$(NC)"; \
	fi

.PHONY: db-migrate-up
db-migrate-up:
	@$(E) "$(GREEN)$(I_DB) Running database migrations (up)...$(NC)"
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service/migrations" ]; then \
			$(E) "$(CYAN)  Migrating $$service...$(NC)"; \
			migrate -path $(SERVICES_DIR)/$$service/migrations \
				-database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" \
				up 2>/dev/null || true; \
		fi; \
	done
	@$(E) "$(GREEN)$(I_OK) Migrations complete$(NC)"

.PHONY: db-migrate-down
db-migrate-down:
	@$(E) "$(YELLOW)$(I_WARN) Rolling back database migrations...$(NC)"
	@$(E) -n "How many steps to rollback? (default: 1): "
	@read steps; \
	steps=$${steps:-1}; \
	for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service/migrations" ]; then \
			$(E) "$(CYAN)  Rolling back $$service ($$steps steps)...$(NC)"; \
			migrate -path $(SERVICES_DIR)/$$service/migrations \
				-database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" \
				down $$steps 2>/dev/null || true; \
		fi; \
	done
	@$(E) "$(GREEN)$(I_OK) Rollback complete$(NC)"

.PHONY: db-migrate-status
db-migrate-status:
	@$(E) "$(GREEN)$(I_DB) Migration Status:$(NC)"
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service/migrations" ]; then \
			$(E) "$(CYAN)  $$service:$(NC)"; \
			migrate -path $(SERVICES_DIR)/$$service/migrations \
				-database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" \
				version 2>/dev/null || echo "  No migrations found"; \
		fi; \
	done
#=============================================================================
# CLEANUP
#=============================================================================
.PHONY: clean
clean:
	@$(E) "$(GREEN)Cleaning build artifacts...$(NC)"
	@for app in $(FE_APPS); do \
		if [ -d "$(APPS_DIR)/$$app/dist" ]; then \
			rm -rf $(APPS_DIR)/$$app/dist; \
			$(E) "  Cleaned $$app/dist"; \
		fi; \
	done
	@for service in $(BE_SERVICES); do \
		if [ -d "$(SERVICES_DIR)/$$service/bin" ]; then \
			rm -rf $(SERVICES_DIR)/$$service/bin; \
			$(E) "  Cleaned $$service/bin"; \
		fi; \
	done
	@$(E) "$(GREEN)$(I_OK) Build artifacts cleaned$(NC)"

.PHONY: clean-all
clean-all: clean
	@$(E) "$(RED)$(I_WARN) WARNING: This will remove ALL dependencies and infrastructure data!$(NC)"
	@$(E) -n "Are you sure? (y/N): "
	@read confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(E) "$(YELLOW)Cleaning everything...$(NC)"; \
		$(DOCKER_COMPOSE) down -v --remove-orphans; \
		for app in $(FE_APPS); do \
			rm -rf $(APPS_DIR)/$$app/node_modules; \
		done; \
		for service in $(BE_SERVICES); do \
			cd $(SERVICES_DIR)/$$service && go clean -cache 2>/dev/null || true; \
			cd $(ROOT_DIR); \
		done; \
		$(E) "$(GREEN)$(I_OK) Everything cleaned$(NC)"; \
	else \
		$(E) "$(GREEN)$(I_OK) Cancelled$(NC)"; \
	fi


#=============================================================================
# CREATE FILES
#=============================================================================
# Daftar file (path relatif dari root sekolah-platform)
FILES = \
frontend/src/components/admin/QuestionCoding.vue \
frontend/src/components/admin/QuestionHotspot.vue \




# Target utama untuk membuat folder dan file
.PHONY: create-files
create-files:
	@for file in $(FILES); do \
		dir=$$(dirname $$file); \
		mkdir -p $$dir; \
		if [ ! -f $$file ]; then \
			touch $$file; \
			echo "Berhasil membuat: $$file"; \
		else \
			echo "File sudah ada: $$file"; \
		fi \
	done
