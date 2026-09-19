// cmd/seed-superadmin/main.go
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
	schedUC "cbt-engine-service/internal/scheduling/usecase"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// seed-superadmin — create/update super admin di platform.db.
//
// Usage:
//
//	go run ./cmd/seed-superadmin -username=superadmin -password=xxx
func main() {
	var (
		username string
		password string
		fullName string
	)
	flag.StringVar(&username, "username", "", "Super admin username (required)")
	flag.StringVar(&password, "password", "", "Password (required, min 8)")
	flag.StringVar(&fullName, "name", "Super Administrator", "Full name")
	flag.Parse()

	if username == "" || password == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/seed-superadmin -username=<u> -password=<p>")
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

	db, err := sql.Open("sqlite3", cfg.PlatformDBPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open platform.db: %v", err)
	}
	defer db.Close()

	hash, err := schedUC.HashPassword(password)
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
		uuid.NewString(), username, hash, fullName,
	); err != nil {
		log.Fatalf("insert: %v", err)
	}

	fmt.Printf("✔ Super admin '%s' berhasil di-upsert ke platform_users.\n", username)
	fmt.Println("")
	fmt.Println("Test login:")
	fmt.Printf("  curl -X POST http://localhost:8082/api/v1/cbt/auth/super/login \\\n")
	fmt.Printf("    -H 'Content-Type: application/json' \\\n")
	fmt.Printf("    -d '{\"username\":\"%s\",\"password\":\"%s\"}'\n", username, password)
}
