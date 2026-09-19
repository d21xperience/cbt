// cmd/seed-dev/main.go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"cbt-engine-service/internal/config"
	schedRepo "cbt-engine-service/internal/scheduling/repository"
	schedUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// seed-dev — seed admin untuk tenant dev.
// Dipanggil setelah ./dev-setup.sh.
func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Buka platform DB
	platformDB, err := sql.Open("sqlite3", cfg.PlatformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open platform.db: %v", err)
	}
	defer platformDB.Close()

	// Cari tenant dev
	subdomain := cfg.DefaultTenantSubdomain
	if subdomain == "" {
		subdomain = "dev"
	}

	var tenantID, dbPath string
	err = platformDB.QueryRow(
		`SELECT tenant_id, db_path FROM tenants WHERE subdomain = ? LIMIT 1`,
		subdomain,
	).Scan(&tenantID, &dbPath)
	if err == sql.ErrNoRows {
		log.Fatalf("tenant '%s' tidak ditemukan. Jalankan ./dev-setup.sh dulu.", subdomain)
	}
	if err != nil {
		log.Fatalf("query tenant: %v", err)
	}

	// Build full path
	fullDBPath := cfg.TenantBasePath + "/" + dbPath
	fmt.Printf("Seeding tenant '%s' (uuid: %s)\n", subdomain, tenantID)
	fmt.Printf("DB path: %s\n", fullDBPath)

	// Buka tenant DB
	tenantDB, err := sql.Open("sqlite3", fullDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open tenant.db: %v", err)
	}
	defer tenantDB.Close()
	tenantDB.SetMaxOpenConns(1)

	// Seed admin
	adminRepo := schedRepo.NewAdminDB(tenantDB)
	hash, err := schedUC.HashPassword("dev123")
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Admin
	if err := adminRepo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     subdomain, // pakai subdomain (bukan UUID) untuk tenant DB
		Username:     "admin",
		PasswordHash: hash,
		Role:         "ADMIN",
		IsActive:     true,
	}); err != nil {
		log.Fatalf("seed admin: %v", err)
	}
	fmt.Println("✔ Admin 'admin' / password 'dev123' (tenant=dev)")

	// Proctor
	if err := adminRepo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     subdomain,
		Username:     "guru1",
		PasswordHash: hash,
		Role:         "PROCTOR",
		IsActive:     true,
	}); err != nil {
		log.Fatalf("seed proctor: %v", err)
	}
	fmt.Println("✔ Proctor 'guru1' / password 'dev123' (tenant=dev)")

	fmt.Println("")
	fmt.Println("Test login:")
	fmt.Println("  curl -X POST http://localhost:8082/api/v1/cbt/auth/admin/login \\")
	fmt.Println("    -H 'X-Tenant-Slug: dev' \\")
	fmt.Println("    -H 'Content-Type: application/json' \\")
	fmt.Println("    -d '{\"username\":\"admin\",\"password\":\"dev123\"}'")
}
