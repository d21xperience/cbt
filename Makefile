
# =========================================================
# PROJECT CONFIGURATION
# =========================================================

PROJECT_DIR := $(CURDIR)
BE_DIR := $(PROJECT_DIR)/backend
FE_DIR := $(PROJECT_DIR)/frontend

SHELL := /bin/bash

.PHONY: dev dev-be dev-fe check-be build-fe

# =========================================================
# DEVELOPMENT: BACKEND + FRONTEND
# =========================================================

dev: check-be
	@echo "================================================="
	@echo "[START] MEMULAI SERVER DEVELOPMENT"
	@echo "================================================="
	@echo "-> Menjalankan Golang Backend Server..."

	@cd "$(BE_DIR)" && go run ./cmd/server & \
	BACKEND_PID=$$!; \
	trap 'echo ""; echo "[STOP] Menghentikan server..."; kill $$BACKEND_PID 2>/dev/null; wait $$BACKEND_PID 2>/dev/null' INT TERM EXIT; \
	sleep 2; \
	echo ""; \
	echo "-------------------------------------------------"; \
	echo "-> Menjalankan Quasar Frontend..."; \
	if [ ! -d "$(FE_DIR)" ]; then \
		echo "[ERROR] Folder frontend tidak ditemukan"; \
		exit 1; \
	fi; \
	cd "$(FE_DIR)" && npm run dev

# =========================================================
# BACKEND
# =========================================================

check-be:
	@if [ ! -d "$(BE_DIR)" ]; then \
		echo "[ERROR] Folder backend tidak ditemukan"; \
		exit 1; \
	fi
	@cd "$(BE_DIR)" && \
	if go fmt ./... > /dev/null 2>&1 && \
	   go vet ./... > /dev/null 2>&1 && \
	   go build ./... > /dev/null 2>&1; then \
		echo "[OK] Backend build succeeded"; \
	else \
		echo "[ERROR] Backend build failed!"; \
		exit 1; \
	fi

dev-be: check-be
	@echo "-> Menjalankan Golang Backend Server..."
	@cd "$(BE_DIR)" && go run ./cmd/server

# =========================================================
# FRONTEND
# =========================================================

dev-fe:
	@if [ ! -d "$(FE_DIR)" ]; then \
		echo "[ERROR] Folder frontend tidak ditemukan"; \
		exit 1; \
	fi
	@if [ ! -f "$(FE_DIR)/package.json" ]; then \
		echo "[ERROR] package.json tidak ditemukan"; \
		exit 1; \
	fi
	@echo "-> Menjalankan Quasar Frontend..."
	@cd "$(FE_DIR)" && npm run dev

# =========================================================
# FRONTEND BUILD
# =========================================================

build-fe:
	@echo "-> Build Quasar PWA..."
	@cd "$(FE_DIR)" && npm run build -- -m pwa
