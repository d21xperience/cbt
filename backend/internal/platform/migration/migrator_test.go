package migration

import (
	"context"
	"database/sql"
	"testing"
	"testing/fstest"

	_ "github.com/mattn/go-sqlite3"
)

var requiredTenantColumns = []string{
	"status",
	"logo_url",
	"approved_at",
	"approved_by",
	"rejected_reason",
	"pending_admin_username",
	"jenjang",
	"program_duration_years",
	"package_tier",
	"billing_type",
	"max_participants",
	"sync_locked",
}

const baselineTenantSchema = `
	CREATE TABLE IF NOT EXISTS tenants (
		tenant_id TEXT PRIMARY KEY,
		npsn TEXT UNIQUE NOT NULL,
		subdomain TEXT UNIQUE NOT NULL,
		school_name TEXT NOT NULL,
		contact_email TEXT,
		contact_phone TEXT,
		address TEXT,
		is_active INTEGER NOT NULL DEFAULT 1,
		is_suspended INTEGER NOT NULL DEFAULT 0,
		suspended_reason TEXT,
		db_path TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
`

func testMigrations(schema string) fstest.MapFS {
	return fstest.MapFS{
		"000001_init.up.sql": {
			Data: []byte(schema),
		},
	}
}

func TestRunAppliesMigrationOnlyOnce(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	migrations := testMigrations(`
		CREATE TABLE IF NOT EXISTS tenants (
			tenant_id TEXT PRIMARY KEY,
			npsn TEXT UNIQUE NOT NULL,
			subdomain TEXT UNIQUE NOT NULL,
			school_name TEXT NOT NULL,
			is_active INTEGER NOT NULL DEFAULT 1,
			is_suspended INTEGER NOT NULL DEFAULT 0,
			db_path TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE test_items (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL
		);

		INSERT INTO test_items (name) VALUES ('first');
	`)

	ctx := context.Background()

	if err := Run(ctx, db, migrations); err != nil {
		t.Fatalf("first migration run failed: %v", err)
	}

	if err := Run(ctx, db, migrations); err != nil {
		t.Fatalf("second migration run failed: %v", err)
	}

	var count int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM test_items`,
	).Scan(&count); err != nil {
		t.Fatalf("count test_items failed: %v", err)
	}

	if count != 1 {
		t.Fatalf("expected 1 row, got %d", count)
	}

	assertMigrationVersions(t, db, []string{
		"000001_init.up.sql",
		"000002_add_tenant_onboarding_fields.up.sql",
		"000003_add_tenant_ops_fields.up.sql",
	})
}

func TestRunCreatesAllTenantColumnsFromMinimalSchema(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	if _, err := db.Exec(baselineTenantSchema); err != nil {
		t.Fatalf("create baseline schema failed: %v", err)
	}

	if err := Run(
		context.Background(),
		db,
		testMigrations(baselineTenantSchema),
	); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	assertTenantColumns(t, db, requiredTenantColumns)

	assertMigrationVersions(t, db, []string{
		"000001_init.up.sql",
		"000002_add_tenant_onboarding_fields.up.sql",
		"000003_add_tenant_ops_fields.up.sql",
	})
}

func TestRunHandlesCompleteTenantSchema(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	completeSchema := baselineTenantSchema + `
		ALTER TABLE tenants ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
		ALTER TABLE tenants ADD COLUMN logo_url TEXT DEFAULT '';
		ALTER TABLE tenants ADD COLUMN approved_at DATETIME NULL;
		ALTER TABLE tenants ADD COLUMN approved_by TEXT DEFAULT '';
		ALTER TABLE tenants ADD COLUMN rejected_reason TEXT DEFAULT '';
		ALTER TABLE tenants ADD COLUMN pending_admin_username TEXT DEFAULT '';
		ALTER TABLE tenants ADD COLUMN jenjang TEXT DEFAULT 'SMA';
		ALTER TABLE tenants ADD COLUMN program_duration_years INTEGER DEFAULT 3;
		ALTER TABLE tenants ADD COLUMN package_tier TEXT DEFAULT 'BASIC';
		ALTER TABLE tenants ADD COLUMN billing_type TEXT DEFAULT 'MONTHLY';
		ALTER TABLE tenants ADD COLUMN max_participants INTEGER DEFAULT 500;
		ALTER TABLE tenants ADD COLUMN sync_locked INTEGER NOT NULL DEFAULT 0;
	`

	if _, err := db.Exec(completeSchema); err != nil {
		t.Fatalf("create complete schema failed: %v", err)
	}

	if err := Run(
		context.Background(),
		db,
		testMigrations(baselineTenantSchema),
	); err != nil {
		t.Fatalf("migration failed on complete schema: %v", err)
	}

	assertTenantColumns(t, db, requiredTenantColumns)

	assertMigrationVersions(t, db, []string{
		"000001_init.up.sql",
		"000002_add_tenant_onboarding_fields.up.sql",
		"000003_add_tenant_ops_fields.up.sql",
	})
}

func TestRunAddsOnlyMissingTenantColumns(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	partialSchema := baselineTenantSchema + `
		ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'PENDING';
		ALTER TABLE tenants ADD COLUMN package_tier TEXT DEFAULT 'PRO';
	`

	if _, err := db.Exec(partialSchema); err != nil {
		t.Fatalf("create partial schema failed: %v", err)
	}

	_, err := db.Exec(`
		INSERT INTO tenants (
			tenant_id, npsn, subdomain, school_name, db_path
		)
		VALUES ('tenant-1', '12345678', 'sekolah-1', 'Sekolah Uji', '/tmp/tenant.db')
	`)
	if err != nil {
		t.Fatalf("insert test tenant failed: %v", err)
	}

	if err := Run(
		context.Background(),
		db,
		testMigrations(baselineTenantSchema),
	); err != nil {
		t.Fatalf("migration failed on partial schema: %v", err)
	}

	assertTenantColumns(t, db, requiredTenantColumns)

	var status, packageTier string

	err = db.QueryRow(`
		SELECT status, package_tier
		FROM tenants
		WHERE tenant_id = 'tenant-1'
	`).Scan(&status, &packageTier)

	if err != nil {
		t.Fatalf("read existing tenant values failed: %v", err)
	}

	if status != "PENDING" {
		t.Errorf("existing status was changed: expected PENDING, got %s", status)
	}

	if packageTier != "PRO" {
		t.Errorf("existing package_tier was changed: expected PRO, got %s", packageTier)
	}
}

func TestRunDoesNotRecordFailedMigration(t *testing.T) {
	db := openTestDB(t)
	defer db.Close()

	migrations := fstest.MapFS{
		"000001_invalid.up.sql": {
			Data: []byte(`
				CREATE TABLE test_items (
					id INTEGER PRIMARY KEY
				);

				THIS IS INVALID SQL;
			`),
		},
	}

	err := Run(context.Background(), db, migrations)
	if err == nil {
		t.Fatal("expected migration error, got nil")
	}

	var count int

	if err := db.QueryRow(
		`SELECT COUNT(*) FROM schema_migrations`,
	).Scan(&count); err != nil {
		t.Fatalf("count schema_migrations failed: %v", err)
	}

	if count != 0 {
		t.Fatalf("expected 0 migration records, got %d", count)
	}
}

func assertTenantColumns(
	t *testing.T,
	db *sql.DB,
	expected []string,
) {
	t.Helper()

	columns, err := readTenantColumnsForTest(db)
	if err != nil {
		t.Fatalf("read tenant columns failed: %v", err)
	}

	for _, name := range expected {
		if !columns[name] {
			t.Errorf("expected tenant column %q to exist", name)
		}
	}
}

func readTenantColumnsForTest(db *sql.DB) (map[string]bool, error) {
	rows, err := db.Query(`PRAGMA table_info(tenants)`)
	if err != nil {
		return nil, err
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
			return nil, err
		}

		columns[name] = true
	}

	return columns, rows.Err()
}

func assertMigrationVersions(
	t *testing.T,
	db *sql.DB,
	expected []string,
) {
	t.Helper()

	var count int

	if err := db.QueryRow(
		`SELECT COUNT(*) FROM schema_migrations`,
	).Scan(&count); err != nil {
		t.Fatalf("count migration records failed: %v", err)
	}

	if count != len(expected) {
		t.Fatalf("expected %d migration records, got %d", len(expected), count)
	}

	for _, version := range expected {
		var exists int

		if err := db.QueryRow(
			`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`,
			version,
		).Scan(&exists); err != nil {
			t.Fatalf("check migration %s failed: %v", version, err)
		}

		if exists != 1 {
			t.Errorf("expected migration %s to be recorded exactly once", version)
		}
	}
}

func openTestDB(t *testing.T) *sql.DB {
	t.Helper()

	db, err := sql.Open(
		"sqlite3",
		"file:"+t.TempDir()+"/migration_test.db?_journal_mode=WAL&_busy_timeout=5000",
	)
	if err != nil {
		t.Fatalf("open sqlite test database: %v", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		t.Fatalf("ping sqlite test database: %v", err)
	}

	db.SetMaxOpenConns(1)

	t.Cleanup(func() {
		db.Close()
	})

	return db
}
