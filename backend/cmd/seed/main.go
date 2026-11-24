// cmd/seed/main.go
//
// Unified seeding CLI untuk CBT engine.
//
// Subcommand:
//
//	superadmin   — seed/upsert super admin di platform.db
//	tenant       — seed admin/proctor di tenant DB (multi-tenant aware)
//	credentials  — generate credentials peserta untuk exam tertentu
//
// Contoh:
//
//	go run ./cmd/seed superadmin -username=root -password=Rahasia123
//	go run ./cmd/seed tenant -subdomain=dev -username=admin -password=admin123 -role=ADMIN
//	go run ./cmd/seed credentials -exam=ef3f5b29... -valid-days=7 -csv
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
	"cbt-engine-service/internal/crypto"
	schedRepo "cbt-engine-service/internal/scheduling/repository"
	schedUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}
	switch os.Args[1] {
	case "superadmin":
		runSuperAdmin(os.Args[2:])
	case "tenant", "admin", "proctor": // alias
		runTenantAdmin(os.Args[2:])
	case "credentials", "creds":
		runCredentials(os.Args[2:])
	case "-h", "--help", "help":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "❌ Unknown subcommand: %s\n\n", os.Args[1])
		usage()
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `Usage: seed <subcommand> [flags]

Subcommands:
  superadmin     Seed super admin di platform.db
  tenant         Seed admin/proctor di tenant DB (resolve dari platform.db)
  credentials    Generate credentials peserta untuk exam

Flags per subcommand:
  seed superadmin -username=<u> -password=<p> [-name=<full>]
  seed tenant     -subdomain=<s> -username=<u> -password=<p> [-role=ADMIN|PROCTOR|TEACHER]
  seed credentials -exam=<exam_id> [-valid-days=N] [-csv]
`)
	os.Exit(2)
}

// ============================================================
// SUBCOMMAND: superadmin — platform.db
// ============================================================
func runSuperAdmin(args []string) {
	fs := flag.NewFlagSet("superadmin", flag.ExitOnError)
	username := fs.String("username", "", "Super admin username (required)")
	password := fs.String("password", "", "Password (required, min 8)")
	fullName := fs.String("name", "Super Administrator", "Full name")
	_ = fs.Parse(args)

	if *username == "" || *password == "" {
		fmt.Fprintln(os.Stderr, "Usage: seed superadmin -username=<u> -password=<p>")
		os.Exit(2)
	}
	if len(*password) < 8 {
		fmt.Fprintln(os.Stderr, "Password minimal 8 karakter")
		os.Exit(2)
	}

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := sql.Open("sqlite3", cfg.PlatformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open platform.db: %v", err)
	}
	defer db.Close()

	hash, err := schedUC.HashPassword(*password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	const q = `
		INSERT INTO platform_users (id, username, password_hash, role, full_name, is_active)
		VALUES (?, ?, ?, 'SUPER_ADMIN', ?, 1)
		ON CONFLICT(username) DO UPDATE SET
		  password_hash = excluded.password_hash,
		  role = 'SUPER_ADMIN',
		  full_name = excluded.full_name,
		  is_active = 1,
		  updated_at = CURRENT_TIMESTAMP`

	if _, err := db.ExecContext(ctx, q,
		uuid.NewString(), *username, hash, *fullName,
	); err != nil {
		log.Fatalf("insert: %v", err)
	}

	fmt.Printf("✔ Super admin '%s' berhasil di-upsert ke platform_users.\n\n", *username)
	fmt.Println("Test login:")
	fmt.Printf("  curl -X POST http://localhost:8082/api/v1/cbt/auth/super/login \\\n")
	fmt.Printf("    -H 'Content-Type: application/json' \\\n")
	fmt.Printf("    -d '{\"username\":\"%s\",\"password\":\"%s\"}'\n", *username, *password)
}

// ============================================================
// SUBCOMMAND: tenant — tenant DB (admin/proctor/teacher)
// ============================================================
func runTenantAdmin(args []string) {
	fs := flag.NewFlagSet("tenant", flag.ExitOnError)
	subdomain := fs.String("subdomain", "", "Tenant subdomain (required)")
	username := fs.String("username", "", "Username (required)")
	password := fs.String("password", "", "Password (required, min 8)")
	role := fs.String("role", "ADMIN", "Role: ADMIN | PROCTOR | TEACHER")
	_ = fs.Parse(args)

	if *subdomain == "" || *username == "" || *password == "" {
		fmt.Fprintln(os.Stderr, "Usage: seed tenant -subdomain=<s> -username=<u> -password=<p> [-role=ADMIN]")
		os.Exit(2)
	}
	if len(*password) < 8 {
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
		*subdomain,
	).Scan(&tenantID, &dbPathRel)
	if err == sql.ErrNoRows {
		log.Fatalf("tenant '%s' tidak ditemukan di platform DB", *subdomain)
	}
	if err != nil {
		log.Fatalf("query tenant: %v", err)
	}

	// 3. Open tenant DB
	fullDBPath := cfg.TenantBasePath + "/" + dbPathRel
	fmt.Printf("Seeding tenant '%s' (uuid: %s)\n", *subdomain, tenantID)
	fmt.Printf("DB path: %s\n", fullDBPath)

	tenantDB, err := sql.Open("sqlite3", fullDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open tenant.db: %v", err)
	}
	defer tenantDB.Close()
	tenantDB.SetMaxOpenConns(1)

	// 4. Hash password
	hash, err := schedUC.HashPassword(*password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 5. Upsert admin — FIX BUG: pakai tenantID (UUID), bukan subdomain
	adminRepo := schedRepo.NewAdminDB(tenantDB)
	if err := adminRepo.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     tenantID, // ✅ konsisten dengan migrate-tenants
		Username:     *username,
		PasswordHash: hash,
		Role:         *role,
		IsActive:     true,
	}); err != nil {
		log.Fatalf("seed: %v", err)
	}

	fmt.Printf("✔ '%s' (tenant=%s [%s], role=%s) berhasil di-upsert.\n",
		*username, *subdomain, tenantID[:8], *role)
}

// ============================================================
// SUBCOMMAND: credentials — generate credentials peserta
// ============================================================
func runCredentials(args []string) {
	fs := flag.NewFlagSet("credentials", flag.ExitOnError)
	examID := fs.String("exam", "", "Exam ID (pembelajaran_id) — required")
	validDays := fs.Int("valid-days", 0, "0=permanent, N=temporary card N days")
	exportCSV := fs.Bool("csv", false, "Export to CSV")
	_ = fs.Parse(args)

	if *examID == "" {
		fmt.Fprintln(os.Stderr, "Usage: seed credentials -exam=<exam_id> [-valid-days=1] [-csv]")
		os.Exit(2)
	}

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	if cfg.CredentialsEncryptionKey == "" {
		log.Fatal("CREDENTIALS_ENCRYPTION_KEY belum diset di .env")
	}

	cipher, err := crypto.NewCipherFromHex(cfg.CredentialsEncryptionKey)
	if err != nil {
		log.Fatalf("cipher: %v", err)
	}

	db, err := sql.Open("sqlite3", cfg.DbSource+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	credRepo := schedRepo.NewCredentialsDB(db)
	uc := schedUC.NewCredentialsUseCase(credRepo, cipher)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	list, err := uc.GenerateForExam(ctx, *examID, "cli-seed", *validDays)
	if err != nil {
		log.Fatalf("generate: %v", err)
	}

	fmt.Printf("✔ Generated %d credentials untuk exam %s\n\n", len(list), *examID)

	if *exportCSV {
		fmt.Println("nisn,username,password,valid_until")
		for _, c := range list {
			vu := ""
			if c.ValidUntil != nil {
				vu = c.ValidUntil.Format("2006-01-02")
			}
			fmt.Printf("%s,%s,%s,%s\n", c.NISN, c.Username, c.Password, vu)
		}
	} else {
		for _, c := range list {
			fmt.Printf("  %s | %s | %s\n", c.NISN, c.Username, c.Password)
		}
	}
}
