package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/platform/domain"
)

type TenantDB struct {
	DB *sql.DB
}

func NewTenantDB(db *sql.DB) *TenantDB {
	return &TenantDB{DB: db}
}

// GetBySubdomain — resolve subdomain ke tenant
func (r *TenantDB) GetBySubdomain(ctx context.Context, subdomain string) (*domain.Tenant, error) {
	const q = `
		SELECT tenant_id, npsn, subdomain, school_name, contact_email, contact_phone,
		       address, is_active, is_suspended, suspended_reason, db_path, created_at, updated_at
		FROM tenants WHERE subdomain = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, subdomain))
}

// GetByNPSN — resolve NPSN
func (r *TenantDB) GetByNPSN(ctx context.Context, npsn string) (*domain.Tenant, error) {
	const q = `
		SELECT tenant_id, npsn, subdomain, school_name, contact_email, contact_phone,
		       address, is_active, is_suspended, suspended_reason, db_path, created_at, updated_at
		FROM tenants WHERE npsn = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, npsn))
}

// GetByID — resolve tenant_id
func (r *TenantDB) GetByID(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	const q = `
		SELECT tenant_id, npsn, subdomain, school_name, contact_email, contact_phone,
		       address, is_active, is_suspended, suspended_reason, db_path, created_at, updated_at
		FROM tenants WHERE tenant_id = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, tenantID))
}

// ListActive — untuk super admin
func (r *TenantDB) ListActive(ctx context.Context) ([]domain.Tenant, error) {
	const q = `
		SELECT tenant_id, npsn, subdomain, school_name, contact_email, contact_phone,
		       address, is_active, is_suspended, suspended_reason, db_path, created_at, updated_at
		FROM tenants WHERE is_active = 1 ORDER BY school_name ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Tenant
	for rows.Next() {
		t, err := r.scanRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

// Create — untuk super admin (self-registration via UI)
func (r *TenantDB) Create(ctx context.Context, t *domain.Tenant) error {
	const q = `
		INSERT INTO tenants (tenant_id, npsn, subdomain, school_name, contact_email,
		                    contact_phone, address, is_active, is_suspended, db_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.DB.ExecContext(ctx, q,
		t.TenantID, t.NPSN, t.Subdomain, t.SchoolName,
		t.ContactEmail, t.ContactPhone, t.Address,
		boolToInt(t.IsActive), boolToInt(t.IsSuspended), t.DBPath)
	if err != nil {
		return fmt.Errorf("create tenant: %w", err)
	}
	return nil
}

// Update — update metadata tenant
func (r *TenantDB) Update(ctx context.Context, t *domain.Tenant) error {
	const q = `
		UPDATE tenants SET
		  school_name = ?, contact_email = ?, contact_phone = ?, address = ?,
		  is_active = ?, is_suspended = ?, suspended_reason = ?,
		  updated_at = CURRENT_TIMESTAMP
		WHERE tenant_id = ?`
	_, err := r.DB.ExecContext(ctx, q,
		t.SchoolName, t.ContactEmail, t.ContactPhone, t.Address,
		boolToInt(t.IsActive), boolToInt(t.IsSuspended), t.SuspendReason,
		t.TenantID)
	return err
}

// ExistsNPSN — untuk validation duplikat
func (r *TenantDB) ExistsNPSN(ctx context.Context, npsn string) (bool, error) {
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM tenants WHERE npsn = ?`, npsn).Scan(&n)
	return n > 0, err
}

func (r *TenantDB) ExistsSubdomain(ctx context.Context, subdomain string) (bool, error) {
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM tenants WHERE subdomain = ?`, subdomain).Scan(&n)
	return n > 0, err
}

// ============ Scan helpers ============

type rowScanner interface {
	Scan(dest ...any) error
}

func (r *TenantDB) scanOne(row rowScanner) (*domain.Tenant, error) {
	var t domain.Tenant
	var isActive, isSuspended int
	var createdAt, updatedAt string
	var suspendedReason sql.NullString

	err := row.Scan(&t.TenantID, &t.NPSN, &t.Subdomain, &t.SchoolName,
		&t.ContactEmail, &t.ContactPhone, &t.Address,
		&isActive, &isSuspended, &suspendedReason,
		&t.DBPath, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	t.IsActive = isActive == 1
	t.IsSuspended = isSuspended == 1
	if suspendedReason.Valid {
		t.SuspendReason = suspendedReason.String
	}
	t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &t, nil
}

func (r *TenantDB) scanRow(rows *sql.Rows) (*domain.Tenant, error) {
	var t domain.Tenant
	var isActive, isSuspended int
	var createdAt, updatedAt string
	var suspendedReason sql.NullString

	if err := rows.Scan(&t.TenantID, &t.NPSN, &t.Subdomain, &t.SchoolName,
		&t.ContactEmail, &t.ContactPhone, &t.Address,
		&isActive, &isSuspended, &suspendedReason,
		&t.DBPath, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	t.IsActive = isActive == 1
	t.IsSuspended = isSuspended == 1
	if suspendedReason.Valid {
		t.SuspendReason = suspendedReason.String
	}
	t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &t, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
