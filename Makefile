
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
	@echo "-> [1/3] gofmt check..."
	@cd "$(BE_DIR)" && \
	UNFORMATTED=$$(gofmt -l .) && \
	if [ -n "$$UNFORMATTED" ]; then \
		echo "[ERROR] File tidak ter-format:"; \
		echo "$$UNFORMATTED"; \
		exit 1; \
	fi
	@echo "-> [2/3] go vet..."
	@cd "$(BE_DIR)" && go vet ./... || { echo "[ERROR] go vet gagal (lihat di atas)"; exit 1; }
	@echo "-> [3/3] go build..."
	@cd "$(BE_DIR)" && go build ./... || { echo "[ERROR] go build gagal (lihat di atas)"; exit 1; }
	@echo "[OK] Backend build succeeded"
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
# BACKEND
# =========================================================
dev-be:
	@echo "================================================="
	@echo "[START] MEMULAI SERVER DEVELOPMENT"
	@echo "================================================="
	@echo "-> Menjalankan Golang Backend Server..."

	@cd "$(BE_DIR)" && go run ./cmd/server & \
	BACKEND_PID=$$!; \
	trap 'echo ""; echo "[STOP] Menghentikan server..."; kill $$BACKEND_PID 2>/dev/null; wait $$BACKEND_PID 2>/dev/null' INT TERM EXIT; \
	sleep 2; \
	echo ""; \
	echo "-------------------------------------------------"; 
# =========================================================
# FRONTEND BUILD
# =========================================================

build-fe:
	@echo "-> Build Quasar PWA..."
	@cd "$(FE_DIR)" && npm run build -- -m pwa
