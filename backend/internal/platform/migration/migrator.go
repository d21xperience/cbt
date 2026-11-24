package migration

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	platformmigrations "cbt-engine-service/migrations/platform"
)

const migrationTable = "schema_migrations"

// Up menjalankan seluruh migrasi platform yang belum diterapkan.
//
// Migrasi dibaca dari embedded filesystem sehingga binary produksi
// tidak bergantung pada keberadaan file SQL di VPS.
func Up(ctx context.Context, db *sql.DB) error {
	return Run(ctx, db, platformmigrations.UpMigrations)
}

// Run menjalankan migrasi dari filesystem yang diberikan.
// Fungsi ini dipisahkan agar dapat diuji menggunakan filesystem sementara.
func Run(ctx context.Context, db *sql.DB, migrations fs.FS) error {
	if db == nil {
		return errors.New("platform migration: database is nil")
	}

	if migrations == nil {
		return errors.New("platform migration: migration filesystem is nil")
	}

	// Pastikan tabel pencatatan migrasi tersedia.
	if err := ensureMigrationTable(ctx, db); err != nil {
		return err
	}

	// Baca daftar file migrasi.
	entries, err := fs.ReadDir(migrations, ".")
	if err != nil {
		return fmt.Errorf("platform migration: read migration directory: %w", err)
	}

	var files []string

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()

		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}

		files = append(files, name)
	}

	sort.Strings(files)

	for _, name := range files {
		if err := applyMigration(ctx, db, migrations, name); err != nil {
			return err
		}
	}
	if err := reconcileTenantSchema(ctx, db); err != nil {
		return err
	}
	return nil
}

func ensureMigrationTable(ctx context.Context, db *sql.DB) error {
	const query = `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version   TEXT PRIMARY KEY,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`

	if _, err := db.ExecContext(ctx, query); err != nil {
		return fmt.Errorf("platform migration: create migration table: %w", err)
	}

	return nil
}

func applyMigration(
	ctx context.Context,
	db *sql.DB,
	migrations fs.FS,
	name string,
) error {
	content, err := fs.ReadFile(migrations, name)
	if err != nil {
		return fmt.Errorf("platform migration: read %s: %w", name, err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("platform migration: begin %s: %w", name, err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Periksa kembali di dalam transaksi.
	// Ini mencegah migrasi dijalankan ulang jika sudah tercatat.
	var exists int

	err = tx.QueryRowContext(
		ctx,
		`SELECT 1 FROM schema_migrations WHERE version = ?`,
		name,
	).Scan(&exists)

	switch {
	case err == nil:
		// Sudah diterapkan.
		return nil

	case errors.Is(err, sql.ErrNoRows):
		// Belum diterapkan. Lanjutkan.

	default:
		return fmt.Errorf(
			"platform migration: check version %s: %w",
			name,
			err,
		)
	}

	// Jalankan SQL migrasi.
	if _, err := tx.ExecContext(ctx, string(content)); err != nil {
		return fmt.Errorf(
			"platform migration: execute %s: %w",
			name,
			err,
		)
	}

	// Catat versi dalam transaksi yang sama.
	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO schema_migrations (version) VALUES (?)`,
		name,
	); err != nil {
		return fmt.Errorf(
			"platform migration: record %s: %w",
			name,
			err,
		)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf(
			"platform migration: commit %s: %w",
			name,
			err,
		)
	}

	return nil
}
