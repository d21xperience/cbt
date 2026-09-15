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

func main() {
	var (
		username string
		password string
		tenant   string
		role     string
	)
	flag.StringVar(&username, "username", "", "Admin username (required)")
	flag.StringVar(&password, "password", "", "Admin password (required, min 8)")
	flag.StringVar(&tenant, "tenant", "default", "Tenant ID")
	flag.StringVar(&role, "role", "ADMIN", "Role: ADMIN | SUPER_ADMIN | TEACHER")
	flag.Parse()

	if username == "" || password == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/seed -username=<u> -password=<p> [-tenant=<t>] [-role=<r>]")
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
	db, err := sql.Open("sqlite3", cfg.DbSource+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	adminDB := schedRepo.NewAdminDB(db)
	hash, err := schedUC.HashPassword(password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = adminDB.Upsert(ctx, &schedRepo.Admin{
		ID:           uuid.NewString(),
		TenantID:     tenant,
		Username:     username,
		PasswordHash: hash,
		Role:         role,
		IsActive:     true,
	})
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	fmt.Printf("✔ Admin '%s' (tenant=%s, role=%s) berhasil di-upsert.\n", username, tenant, role)
}
