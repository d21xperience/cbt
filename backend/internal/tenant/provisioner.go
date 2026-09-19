package tenant

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	platformDomain "cbt-engine-service/internal/platform/domain"
	schedRepo "cbt-engine-service/internal/scheduling/repository"
	schedUC "cbt-engine-service/internal/scheduling/usecase"

	"cbt-engine-service/migrations"

	"github.com/google/uuid"
)

var (
	ErrProvisionFailed = errors.New("provision_failed")
)

// Provisioner — create + migrate + seed a new tenant DB.
//
// Idempotent: if called twice with same tenant, second call detects existing DB
// and applies migrations again (idempotent by design).
//
// Rollback: on failure, tenant folder is deleted (best effort).
type Provisioner struct {
	BasePath string
}

func NewProvisioner(basePath string) *Provisioner {
	return &Provisioner{BasePath: basePath}
}

// Provision — orchestrates tenant DB creation.
//
// Steps:
//  1. Create folder /var/lib/cbt/tenants/{tenantID}/
//  2. Open SQLite (creates empty file)
//  3. Apply all .up.sql migrations (embedded)
//  4. Insert admin user into tenant DB
//  5. Close DB
//
// On failure: rollback by deleting folder (best effort).
func (p *Provisioner) Provision(
	ctx context.Context,
	tenantID, subdomain string,
	adminUsername, adminPassword string,
) error {
	if tenantID == "" || subdomain == "" {
		return fmt.Errorf("%w: tenant_id dan subdomain wajib", ErrProvisionFailed)
	}
	if adminUsername == "" || adminPassword == "" {
		return fmt.Errorf("%w: admin credentials wajib", ErrProvisionFailed)
	}

	tenantDir := filepath.Join(p.BasePath, "tenants", tenantID)
	dbPath := filepath.Join(tenantDir, "cbt.db")

	// === Step 1: Create folder ===
	if err := os.MkdirAll(tenantDir, 0755); err != nil {
		return fmt.Errorf("%w: mkdir: %v", ErrProvisionFailed, err)
	}

	// === Rollback hook ===
	success := false
	defer func() {
		if !success {
			if err := os.RemoveAll(tenantDir); err != nil {
				log.Printf("[PROVISIONER] Rollback failed for %s: %v", tenantDir, err)
			} else {
				log.Printf("[PROVISIONER] Rollback deleted %s", tenantDir)
			}
		}
	}()

	// === Step 2: Open SQLite (creates file) ===
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return fmt.Errorf("%w: open db: %v", ErrProvisionFailed, err)
	}
	defer db.Close()

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	// Apply per-tenant PRAGMA
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA cache_size=-16000;",
		"PRAGMA temp_store=MEMORY;",
		"PRAGMA mmap_size=67108864;",
		"PRAGMA foreign_keys=ON;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			log.Printf("[PROVISIONER] PRAGMA warn %s: %v", p, err)
		}
	}

	// === Step 3: Apply migrations ===
	if err := p.applyMigrations(ctx, db); err != nil {
		return fmt.Errorf("%w: migrations: %v", ErrProvisionFailed, err)
	}

	// === Step 4: Seed admin user ===
	if err := p.seedAdmin(ctx, db, subdomain, adminUsername, adminPassword); err != nil {
		return fmt.Errorf("%w: seed admin: %v", ErrProvisionFailed, err)
	}

	log.Printf("[PROVISIONER] Tenant %s provisioned successfully (db=%s)", tenantID, dbPath)
	success = true
	return nil
}

// skipInProvisioner — migrations yang TIDAK boleh di-apply saat provisioning fresh tenant.
//
// Alasan:
//
//	000013 — backfill untuk MIGRATED existing DB, fresh DB tidak punya row untuk backfill
//	000014 — platform-only (ALTER tenants — tidak ada di tenant DB)
//	000015 — platform-only (ALTER tenants — tidak ada di tenant DB)
//
// Reference: scripts/migrations-manifest.txt
var skipInProvisioner = map[string]bool{
	"000013_backfill_tenant_id.up.sql":         true,
	"000014_add_tenant_status.up.sql":          true,
	"000015_add_pending_admin_username.up.sql": true,
}

// applyMigrations — run embedded tenant migrations only.
// Platform migrations (000014+) DILEWATI karena hanya untuk platform DB.
func (p *Provisioner) applyMigrations(ctx context.Context, db *sql.DB) error {
	entries, err := migrations.UpMigrations.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	// Filter tenant-only migrations
	// Filter migrations — skip yang bukan untuk fresh provisioning
	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if skipInProvisioner[name] {
			log.Printf("[PROVISIONER] Skip migration (not for fresh provisioning): %s", name)
			continue
		}
		files = append(files, name)
	}

	log.Printf("[PROVISIONER] Applying %d tenant migrations", len(files))

	for _, name := range files {
		content, err := migrations.UpMigrations.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		if _, err := db.ExecContext(ctx, string(content)); err != nil {
			errStr := err.Error()
			// Tolerate "duplicate column" / "already exists" (idempotent re-run)
			if contains(errStr, "duplicate column") || contains(errStr, "already exists") {
				log.Printf("[PROVISIONER] Skip (idempotent) %s: %v", name, err)
				continue
			}
			return fmt.Errorf("exec %s: %w", name, err)
		}
		log.Printf("[PROVISIONER]   ✓ %s", name)
	}
	return nil
}

// seedAdmin — insert admin user into tenant DB.
// Uses subdomain as tenant_id (consistent with existing convention).
func (p *Provisioner) seedAdmin(ctx context.Context, db *sql.DB, subdomain, username, password string) error {
	adminRepo := schedRepo.NewAdminDB(db)

	hash, err := schedUC.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	return adminRepo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     subdomain, // subdomain (bukan UUID) — konsisten dengan existing
		Username:     username,
		PasswordHash: hash,
		Role:         "ADMIN",
		IsActive:     true,
	})
}

// contains — simple substring check (avoid import strings di file kecil).
func contains(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(s) < len(substr) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Ensure Tenant satisfies minimal interface for provisioner
var _ = platformDomain.Tenant{}
var _ = time.Now
