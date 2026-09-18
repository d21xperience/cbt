package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"time"

	"cbt-engine-service/internal/config"
	platformDomain "cbt-engine-service/internal/platform/domain"
	platformRepo "cbt-engine-service/internal/platform/repository"
	platformUC "cbt-engine-service/internal/platform/usecase"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// CLI untuk migrasi existing single-tenant cbt.db ke multi-tenant structure
//
// Usage:
//
//	go run ./cmd/migrate-tenants \
//	  -source=/var/lib/cbt/cbt.db \
//	  -base=/var/lib/cbt \
//	  -npsn=20254180 \
//	  -subdomain=smkjaya \
//	  -name="SMK Jaya"
func main() {
	var (
		sourcePath = flag.String("source", "", "Path ke cbt.db existing (source)")
		basePath   = flag.String("base", "/var/lib/cbt", "Base path untuk struktur multi-tenant")
		npsn       = flag.String("npsn", "", "NPSN sekolah (8 digit)")
		subdomain  = flag.String("subdomain", "", "Subdomain (mis. smkjaya)")
		schoolName = flag.String("name", "", "Nama lengkap sekolah")
		dryRun     = flag.Bool("dry-run", false, "Hanya print, tidak execute")
	)
	flag.Parse()

	if *sourcePath == "" || *npsn == "" || *subdomain == "" || *schoolName == "" {
		fmt.Fprintln(os.Stderr, "Usage: migrate-tenants -source=<path> -npsn=<8digit> -subdomain=<slug> -name=<name>")
		os.Exit(2)
	}

	cfg, _ := config.LoadConfig(".")

	fmt.Println("==========================================")
	fmt.Println("  TENANT MIGRATION (Single → Multi)")
	fmt.Println("==========================================")
	fmt.Printf("Source DB:    %s\n", *sourcePath)
	fmt.Printf("Base path:    %s\n", *basePath)
	fmt.Printf("NPSN:         %s\n", *npsn)
	fmt.Printf("Subdomain:    %s\n", *subdomain)
	fmt.Printf("School Name:  %s\n", *schoolName)
	fmt.Printf("Dry run:      %v\n", *dryRun)
	fmt.Println("")

	// 1. Verify source exists
	if _, err := os.Stat(*sourcePath); os.IsNotExist(err) {
		log.Fatalf("❌ Source tidak ditemukan: %s", *sourcePath)
	}

	// 2. Prepare target structure
	tenantID := uuid.NewString()
	platformDir := filepath.Join(*basePath, "platform")
	tenantDir := filepath.Join(*basePath, "tenants", tenantID)
	tenantDBPath := filepath.Join(tenantDir, "cbt.db")

	fmt.Printf("Tenant ID (generated): %s\n", tenantID)
	fmt.Printf("Target DB:             %s\n", tenantDBPath)
	fmt.Println("")

	if *dryRun {
		fmt.Println("=== DRY RUN — tidak ada file yang diubah ===")
		return
	}

	// 3. Buat folder structure
	for _, d := range []string{platformDir, tenantDir} {
		if err := os.MkdirAll(d, 0755); err != nil {
			log.Fatalf("❌ Gagal buat folder %s: %v", d, err)
		}
	}
	fmt.Println("✅ Folder structure siap")

	// 4. Copy source DB ke tenant DB
	if err := copyFile(*sourcePath, tenantDBPath); err != nil {
		log.Fatalf("❌ Gagal copy DB: %v", err)
	}
	fmt.Printf("✅ Copied DB → %s\n", tenantDBPath)
	// Set proper ownership (kalau running as root)
	if os.Geteuid() == 0 {
		// Cari user 'cbt'
		if u, err := user.Lookup("cbt"); err == nil {
			uid, _ := strconv.Atoi(u.Uid)
			gid, _ := strconv.Atoi(u.Gid)

			// Chown tenant dir
			filepath.Walk(tenantDir, func(path string, info os.FileInfo, err error) error {
				if err == nil {
					os.Chown(path, uid, gid)
				}
				return nil
			})
			// Chown platform dir
			filepath.Walk(platformDir, func(path string, info os.FileInfo, err error) error {
				if err == nil {
					os.Chown(path, uid, gid)
				}
				return nil
			})
			fmt.Println("✅ Ownership set to cbt:cbt")
		}
	}
	// 5. Init platform.db
	platformDBPath := filepath.Join(platformDir, "platform.db")
	platformDB, err := sql.Open("sqlite3", platformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("❌ Gagal buka platform.db: %v", err)
	}
	defer platformDB.Close()
	platformDB.SetMaxOpenConns(1)

	// Apply platform migration
	if err := applyPlatformMigration(platformDB); err != nil {
		log.Fatalf("❌ Gagal apply migration platform: %v", err)
	}
	fmt.Println("✅ Platform DB initialized")

	// 6. Insert tenant
	tenantRepo := platformRepo.NewTenantDB(platformDB)
	tenantUC := platformUC.NewTenantUseCase(tenantRepo, *basePath)
	_ = tenantUC // unused for now

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check duplicate NPSN
	exists, _ := tenantRepo.ExistsNPSN(ctx, *npsn)
	if exists {
		log.Fatalf("❌ NPSN %s sudah terdaftar di platform.db", *npsn)
	}
	exists, _ = tenantRepo.ExistsSubdomain(ctx, *subdomain)
	if exists {
		log.Fatalf("❌ Subdomain %s sudah terdaftar", *subdomain)
	}

	// Insert tenant
	relDBPath := filepath.Join("tenants", tenantID, "cbt.db")
	if err := tenantRepo.Create(ctx, &platformDomain.Tenant{
		TenantID:   tenantID,
		NPSN:       *npsn,
		Subdomain:  *subdomain,
		SchoolName: *schoolName,
		IsActive:   true,
		DBPath:     relDBPath,
	}); err != nil {
		log.Fatalf("❌ Gagal insert tenant: %v", err)
	}

	fmt.Println("")
	fmt.Println("==========================================")
	fmt.Println("  ✅ MIGRASI BERHASIL")
	fmt.Println("==========================================")
	fmt.Printf("Tenant ID:  %s\n", tenantID)
	fmt.Printf("Subdomain:  %s\n", *subdomain)
	fmt.Printf("Platform DB: %s\n", platformDBPath)
	fmt.Printf("Tenant DB:   %s\n", tenantDBPath)
	fmt.Println("")
	fmt.Println("Next steps:")
	fmt.Println("1. Update .env: MULTI_TENANT_MODE=true")
	fmt.Println("2. Update .env: PLATFORM_DB_PATH=" + platformDBPath)
	fmt.Println("3. Update .env: TENANT_BASE_PATH=" + *basePath)
	fmt.Println("4. Restart backend: systemctl restart cbt-backend")
	fmt.Println("5. Verify: curl https://<subdomain>.<domain>/health")
	fmt.Println("")
	fmt.Println("⚠️  Source DB TIDAK dihapus. Backup lama tetap ada.")
	_ = cfg
}

// ============ Helpers ============

func copyFile(src, dst string) error {
	srcData, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	return os.WriteFile(dst, srcData, 0640)
}

func applyPlatformMigration(db *sql.DB) error {
	// Minimal — replace dengan migrator sebenarnya kalau ada
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS tenants (
			tenant_id TEXT PRIMARY KEY,
			npsn TEXT UNIQUE NOT NULL,
			subdomain TEXT UNIQUE NOT NULL,
			school_name TEXT NOT NULL,
			contact_email TEXT DEFAULT '',
			contact_phone TEXT DEFAULT '',
			address TEXT DEFAULT '',
			is_active INTEGER NOT NULL DEFAULT 1,
			is_suspended INTEGER NOT NULL DEFAULT 0,
			suspended_reason TEXT DEFAULT '',
			db_path TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);`,
		`CREATE INDEX IF NOT EXISTS idx_tenants_npsn ON tenants(npsn);`,
		`CREATE TABLE IF NOT EXISTS platform_users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
			full_name TEXT DEFAULT '',
			is_active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS subscriptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tenant_id TEXT NOT NULL,
			plan TEXT NOT NULL DEFAULT 'BASIC',
			valid_from DATETIME NOT NULL,
			valid_until DATETIME NOT NULL,
			is_active INTEGER NOT NULL DEFAULT 1,
			price_idr INTEGER DEFAULT 0,
			notes TEXT DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS platform_audit_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			actor_id TEXT NOT NULL,
			action TEXT NOT NULL,
			target_type TEXT DEFAULT '',
			target_id TEXT DEFAULT '',
			details TEXT DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migration: %w", err)
		}
	}
	return nil
}
