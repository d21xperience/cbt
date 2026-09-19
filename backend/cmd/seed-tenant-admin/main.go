// cmd/seed-tenant-admin/main.go
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"cbt-engine-service/internal/config"
	schedRepo "cbt-engine-service/internal/scheduling/repository"
	schedUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// seed-tenant-admin — seed admin/proctor ke tenant DB.
// Resolve DB path dari platform DB (multi-tenant aware).
//
// Usage:
//
//	go run ./cmd/seed-tenant-admin \
//	  -subdomain=dev \
//	  -username=admin \
//	  -password=admin123 \
//	  -role=ADMIN
func main() {
	var (
		subdomain string
		username  string
		password  string
		role      string
	)
	flag.StringVar(&subdomain, "subdomain", "", "Tenant subdomain (required)")
	flag.StringVar(&username, "username", "", "Username (required)")
	flag.StringVar(&password, "password", "", "Password (required, min 8)")
	flag.StringVar(&role, "role", "ADMIN", "Role: ADMIN | PROCTOR | TEACHER")
	flag.Parse()

	if subdomain == "" || username == "" || password == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/seed-tenant-admin -subdomain=<s> -username=<u> -password=<p> [-role=ADMIN]")
		os.Exit(2)
	}
	if len(password) < 8 {
		fmt.Fprintln(os.Stderr, "Password minimal 8 karakter")
		os.Exit(2)
	}

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// 1. Open platform DB
	platformDB, err := sql.Open("sqlite3", cfg.PlatformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open platform.db: %v", err)
	}
	defer platformDB.Close()

	// 2. Resolve tenant
	var tenantID, dbPathRel string
	err = platformDB.QueryRow(
		`SELECT tenant_id, db_path FROM tenants WHERE subdomain = ? LIMIT 1`,
		subdomain,
	).Scan(&tenantID, &dbPathRel)
	if err == sql.ErrNoRows {
		log.Fatalf("tenant '%s' tidak ditemukan di platform DB", subdomain)
	}
	if err != nil {
		log.Fatalf("query tenant: %v", err)
	}

	// 3. Build full DB path
	fullDBPath := cfg.TenantBasePath + "/" + dbPathRel
	fmt.Printf("Seeding tenant '%s' (uuid: %s)\n", subdomain, tenantID)
	fmt.Printf("DB path: %s\n", fullDBPath)

	// 4. Open tenant DB
	tenantDB, err := sql.Open("sqlite3", fullDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open tenant.db: %v", err)
	}
	defer tenantDB.Close()
	tenantDB.SetMaxOpenConns(1)

	// 5. Hash password
	hash, err := schedUC.HashPassword(password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 6. Upsert admin
	adminRepo := schedRepo.NewAdminDB(tenantDB)
	if err := adminRepo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     subdomain, // subdomain (bukan UUID) untuk tenant DB
		Username:     username,
		PasswordHash: hash,
		Role:         role,
		IsActive:     true,
	}); err != nil {
		log.Fatalf("seed: %v", err)
	}

	fmt.Printf("✔ '%s' / '%s' (tenant=%s, role=%s) berhasil di-upsert.\n",
		username, password, subdomain, role)
}
