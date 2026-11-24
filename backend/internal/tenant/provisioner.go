package tenant

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	schedRepo "cbt-engine-service/internal/scheduling/repository"
	schedUC "cbt-engine-service/internal/scheduling/usecase"
	"cbt-engine-service/migrations"

	"github.com/google/uuid"
)

var (
	ErrProvisionFailed = errors.New("provision_failed")
)

type Provisioner struct {
	BasePath   string
	PlatformDB *sql.DB // FASE 3: kredensial admin di platform DB
}

// NewProvisioner — basePath wajib; platformDB opsional (jika nil, seedAdmin fallback ke tenant DB).
func NewProvisioner(basePath string, platformDB ...*sql.DB) *Provisioner {
	p := &Provisioner{BasePath: basePath}
	if len(platformDB) > 0 {
		p.PlatformDB = platformDB[0]
	}
	return p
}

// Provision — orchestrates tenant DB creation.
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
	dbPath := filepath.ToSlash(filepath.Join(tenantDir, "cbt.db"))

	// === Step 1: Create folder ===
	if err := os.MkdirAll(tenantDir, 0o755); err != nil {
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
	dsn := fmt.Sprintf("file:%s?_journal_mode=WAL&_busy_timeout=5000", dbPath)
	db, err := sql.Open("sqlite3", dsn)

	if err != nil {
		return fmt.Errorf("%w: open db: %v", ErrProvisionFailed, err)
	}
	defer db.Close()

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

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
	// FASE 3: admin dipindah ke platform DB. Jika PlatformDB tersedia, seed di sana.
	// Jika tidak, fallback ke tenant DB (legacy).
	if err := p.seedAdmin(ctx, db, tenantID, subdomain, adminUsername, adminPassword); err != nil {
		return fmt.Errorf("%w: seed admin: %v", ErrProvisionFailed, err)
	}

	log.Printf("[PROVISIONER] Tenant %s provisioned successfully (db=%s)", tenantID, dbPath)
	success = true
	return nil
}

var skipInProvisioner = map[string]bool{
	"006_tenant_master_keahlian.up.sql": true,
}

func (p *Provisioner) applyMigrations(ctx context.Context, db *sql.DB) error {
	entries, err := migrations.UpMigrations.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if skipInProvisioner[name] {
			log.Printf("[PROVISIONER] Skip migration: %s", name)
			continue
		}
		files = append(files, name)
	}

	sort.Strings(files)

	log.Printf("[PROVISIONER] Applying %d tenant migrations", len(files))

	for _, name := range files {
		content, err := migrations.UpMigrations.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		if _, err := db.ExecContext(ctx, string(content)); err != nil {
			errStr := err.Error()
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

// seedAdmin — FASE 3: INSERT admin ke PLATFORM DB (bukan tenant DB).
// tenantID (UUID) dan subdomain dipakai untuk lookup compatibility.
// Fallback: jika PlatformDB == nil, seed ke tenant DB (legacy).
func (p *Provisioner) seedAdmin(
	ctx context.Context,
	tenantDB *sql.DB,
	tenantID, subdomain, username, password string,
) error {
	hash, err := schedUC.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	// ── FASE 3: Seed ke platform DB
	if p.PlatformDB != nil {
		repo := schedRepo.NewAdminDB(p.PlatformDB)
		if err := repo.Upsert(ctx, &schedRepo.Admin{
			ID:           uuid.NewString(),
			TenantID:     tenantID, 
			Username:     username,
			PasswordHash: hash,
			Role:         "ADMIN",
			IsActive:     true,
		}); err != nil {
			return fmt.Errorf("upsert admin (platform): %w", err)
		}
		log.Printf("[PROVISIONER] Admin '%s' seeded to PLATFORM DB (tenant=%s)", username, subdomain)
		return nil
	}

	// ── Fallback: seed ke tenant DB (legacy — untuk dev tenant lama)
	repo := schedRepo.NewAdminDB(tenantDB)
	if err := repo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     subdomain,
		Username:     username,
		PasswordHash: hash,
		Role:         "ADMIN",
		IsActive:     true,
	}); err != nil {
		return fmt.Errorf("upsert admin (tenant): %w", err)
	}
	log.Printf("[PROVISIONER] Admin '%s' seeded to TENANT DB (legacy)", username)
	return nil
}

// contains — simple substring check.
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
