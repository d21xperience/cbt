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
	flag.StringVar(&username, "username", "", "Proctor username (required)")
	flag.StringVar(&password, "password", "", "Password (required)")
	flag.StringVar(&tenant, "tenant", "default", "Tenant ID")
	flag.StringVar(&role, "role", "PROCTOR", "Role: PROCTOR | TEACHER")
	flag.Parse()

	if username == "" || password == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/seed-proctor -username=<u> -password=<p>")
		os.Exit(2)
	}

	cfg, _ := config.LoadConfig(".")
	db, err := sql.Open("sqlite3", cfg.DbSource+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	adminRepo := schedRepo.NewAdminDB(db)
	hash, _ := schedUC.HashPassword(password)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = adminRepo.Upsert(ctx, &schedRepo.Admin{
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
	fmt.Printf("✔ Proctor '%s' (tenant=%s, role=%s) berhasil dibuat.\n", username, tenant, role)
}
