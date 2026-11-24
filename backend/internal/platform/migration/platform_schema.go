package migration

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

type columnDefinition struct {
	name string
	sql  string
}

var tenantSchemaMigrations = []struct {
	version string
	columns []columnDefinition
}{
	{
		version: "000002_add_tenant_onboarding_fields.up.sql",
		columns: []columnDefinition{
			{name: "status", sql: `ALTER TABLE tenants ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'`},
			{name: "logo_url", sql: `ALTER TABLE tenants ADD COLUMN logo_url TEXT DEFAULT ''`},
			{name: "approved_at", sql: `ALTER TABLE tenants ADD COLUMN approved_at DATETIME NULL`},
			{name: "approved_by", sql: `ALTER TABLE tenants ADD COLUMN approved_by TEXT DEFAULT ''`},
			{name: "rejected_reason", sql: `ALTER TABLE tenants ADD COLUMN rejected_reason TEXT DEFAULT ''`},
			{name: "pending_admin_username", sql: `ALTER TABLE tenants ADD COLUMN pending_admin_username TEXT DEFAULT ''`},
			{name: "jenjang", sql: `ALTER TABLE tenants ADD COLUMN jenjang TEXT DEFAULT 'SMA'`},
			{name: "program_duration_years", sql: `ALTER TABLE tenants ADD COLUMN program_duration_years INTEGER DEFAULT 3`},
		},
	},
	{
		version: "000003_add_tenant_ops_fields.up.sql",
		columns: []columnDefinition{
			{name: "package_tier", sql: `ALTER TABLE tenants ADD COLUMN package_tier TEXT DEFAULT 'BASIC'`},
			{name: "billing_type", sql: `ALTER TABLE tenants ADD COLUMN billing_type TEXT DEFAULT 'MONTHLY'`},
			{name: "max_participants", sql: `ALTER TABLE tenants ADD COLUMN max_participants INTEGER DEFAULT 500`},
			{name: "sync_locked", sql: `ALTER TABLE tenants ADD COLUMN sync_locked INTEGER NOT NULL DEFAULT 0`},
		},
	},
}

func reconcileTenantSchema(ctx context.Context, db *sql.DB) error {
	for _, migration := range tenantSchemaMigrations {
		if err := applyTenantSchemaMigration(ctx, db, migration.version, migration.columns); err != nil {
			return err
		}
	}

	return nil
}

func applyTenantSchemaMigration(
	ctx context.Context,
	db *sql.DB,
	version string,
	definitions []columnDefinition,
) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("platform migration: begin %s: %w", version, err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	columns, err := readTableColumns(ctx, tx, "tenants")
	if err != nil {
		return err
	}

	for _, definition := range definitions {
		if columns[definition.name] {
			continue
		}

		if _, err := tx.ExecContext(ctx, definition.sql); err != nil {
			return fmt.Errorf(
				"platform migration: add %s in %s: %w",
				definition.name,
				version,
				err,
			)
		}
	}

	var exists int
	err = tx.QueryRowContext(
		ctx,
		`SELECT 1 FROM schema_migrations WHERE version = ?`,
		version,
	).Scan(&exists)

	switch {
	case err == nil:
		// Versi sudah tercatat. Struktur tetap diperiksa di atas.
	case errors.Is(err, sql.ErrNoRows):
		_, err = tx.ExecContext(
			ctx,
			`INSERT INTO schema_migrations (version) VALUES (?)`,
			version,
		)
		if err != nil {
			return fmt.Errorf("platform migration: record %s: %w", version, err)
		}
	default:
		return fmt.Errorf("platform migration: check %s: %w", version, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("platform migration: commit %s: %w", version, err)
	}

	return nil
}

func readTableColumns(
	ctx context.Context,
	tx *sql.Tx,
	table string,
) (map[string]bool, error) {
	rows, err := tx.QueryContext(ctx, `PRAGMA table_info(`+table+`)`)
	if err != nil {
		return nil, fmt.Errorf("platform migration: inspect %s: %w", table, err)
	}
	defer rows.Close()

	columns := make(map[string]bool)

	for rows.Next() {
		var (
			cid        int
			name       string
			dataType   string
			notNull    int
			defaultVal sql.NullString
			primaryKey int
		)

		if err := rows.Scan(
			&cid,
			&name,
			&dataType,
			&notNull,
			&defaultVal,
			&primaryKey,
		); err != nil {
			return nil, fmt.Errorf("platform migration: scan %s: %w", table, err)
		}

		columns[name] = true
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("platform migration: read %s: %w", table, err)
	}

	if len(columns) == 0 {
		return nil, fmt.Errorf("platform migration: table %s does not exist", table)
	}

	return columns, nil
}
