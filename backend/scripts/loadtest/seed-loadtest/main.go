package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"cbt-engine-service/internal/config"
	"cbt-engine-service/internal/crypto"
	schedRepo "cbt-engine-service/internal/scheduling/repository"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("config: %v", err)
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
	ctx := context.Background()

	// Password seragam untuk load test
	const fixedPassword = "LOADTST"

	// Ambil semua NISN dari eligible_participants load test
	rows, err := db.QueryContext(ctx, `
		SELECT DISTINCT nisn FROM eligible_participants
		WHERE pembelajaran_id = 'loadtest-exam' AND nisn LIKE '99%'`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var nisns []string
	for rows.Next() {
		var n string
		_ = rows.Scan(&n)
		nisns = append(nisns, n)
	}

	fmt.Printf("Found %d NISN\n", len(nisns))

	enc, iv, _ := cipher.Encrypt(fixedPassword)

	// Bulk insert via transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO participant_credentials (nisn, username, password_enc, password_iv, is_active, generated_by)
		VALUES (?, ?, ?, ?, 1, 'loadtest-seed')
		ON CONFLICT(nisn) DO UPDATE SET
		  password_enc = excluded.password_enc,
		  password_iv = excluded.password_iv,
		  is_active = 1`)
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	for _, nisn := range nisns {
		if _, err := stmt.ExecContext(ctx, nisn, nisn, enc, iv); err != nil {
			log.Fatalf("insert %s: %v", nisn, err)
		}
	}

	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("✔ Inserted %d credentials with password=%s\n", len(nisns), fixedPassword)
	_ = credRepo // avoid unused warning
	_ = time.Now
}
