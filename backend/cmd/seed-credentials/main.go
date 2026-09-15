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

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	var (
		examID    string
		validDays int
		exportCSV bool
	)
	flag.StringVar(&examID, "exam", "", "Exam ID (pembelajaran_id) — required")
	flag.IntVar(&validDays, "valid-days", 0, "0=permanent, N=temporary card N days")
	flag.BoolVar(&exportCSV, "csv", false, "Export to CSV")
	flag.Parse()

	if examID == "" {
		fmt.Fprintln(os.Stderr, "Usage: go run ./cmd/seed-credentials -exam=<exam_id> [-valid-days=1] [-csv]")
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

	list, err := uc.GenerateForExam(ctx, examID, "cli-seed", validDays)
	if err != nil {
		log.Fatalf("generate: %v", err)
	}

	fmt.Printf("✔ Generated %d credentials untuk exam %s\n\n", len(list), examID)

	if exportCSV {
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
