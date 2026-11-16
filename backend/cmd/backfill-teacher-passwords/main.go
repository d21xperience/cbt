package main

import (
	"cbt-engine-service/internal/crypto"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "Dry run — hanya laporkan rencana")
	dbPath := flag.String("db", "", "Path ke tenant cbt.db")
	flag.Parse()

	if *dbPath == "" {
		log.Fatal("--db wajib")
	}

	// Best-effort load .env (tidak override shell env)
	_ = loadDotEnv(".env")

	key := os.Getenv("CREDENTIALS_ENCRYPTION_KEY")
	if key == "" {
		log.Fatal("CREDENTIALS_ENCRYPTION_KEY wajib (di .env atau shell)")
	}

	cipher, err := crypto.NewCipherFromHex(key)
	if err != nil {
		log.Fatalf("cipher: %v", err)
	}

	db, err := sql.Open("sqlite3", *dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	// GUARD: kalau kolom password_enc belum ada, skip (migration 000035 belum dijalankan)
	if !columnExists(db, "teachers", "password_enc") {
		log.Println("SKIP: kolom teachers.password_enc belum ada — jalankan migration 000035 dulu")
		return
	}
	if !columnExists(db, "teachers", "password_iv") {
		log.Println("SKIP: kolom teachers.password_iv belum ada — jalankan migration 000035 dulu")
		return
	}

	rows, err := db.Query(`SELECT id, COALESCE(password_plain, '') FROM teachers
		WHERE password_enc IS NULL AND password_plain IS NOT NULL AND password_plain != ''`)
	if err != nil {
		log.Fatalf("query: %v", err)
	}
	defer rows.Close()

	type job struct{ id, plain string }
	var jobs []job
	for rows.Next() {
		var j job
		if err := rows.Scan(&j.id, &j.plain); err != nil {
			log.Fatalf("scan: %v", err)
		}
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("rows: %v", err)
	}

	fmt.Printf("TO_BACKFILL=%d DRY_RUN=%v\n", len(jobs), *dryRun)
	if *dryRun {
		return
	}

	ok, fail := 0, 0
	for _, j := range jobs {
		enc, iv, err := cipher.Encrypt(j.plain)
		if err != nil {
			log.Printf("FAIL id=%s encrypt: %v", j.id, err)
			fail++
			continue
		}
		if _, err := db.Exec(`UPDATE teachers SET password_enc=?, password_iv=? WHERE id=?`, enc, iv, j.id); err != nil {
			log.Printf("FAIL id=%s update: %v", j.id, err)
			fail++
			continue
		}
		ok++
	}
	fmt.Printf("BACKFILLED=%d FAILED=%d\n", ok, fail)
	if fail > 0 {
		os.Exit(1)
	}
}

func columnExists(db *sql.DB, table, column string) bool {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			continue
		}
		if name == column {
			return true
		}
	}
	return false
}

func loadDotEnv(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
	return nil
}
