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

// ============================================
// SELECT column list (shared)
// ============================================

const tenantColumns = `
	tenant_id, npsn, subdomain, school_name,
	COALESCE(contact_email, '') AS contact_email,
	COALESCE(contact_phone, '') AS contact_phone,
	COALESCE(address, '') AS address,
	is_active, is_suspended,
	COALESCE(suspended_reason, '') AS suspended_reason,
	db_path,
	COALESCE(status, 'ACTIVE') AS status,
	COALESCE(logo_url, '') AS logo_url,
	approved_at,
	COALESCE(approved_by, '') AS approved_by,
	COALESCE(rejected_reason, '') AS rejected_reason,
	COALESCE(pending_admin_username, '') AS pending_admin_username,
	created_at, updated_at
`

// ============================================
// Get by key
// ============================================

func (r *TenantDB) GetBySubdomain(ctx context.Context, subdomain string) (*domain.Tenant, error) {
	q := `SELECT ` + tenantColumns + ` FROM tenants WHERE subdomain = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, subdomain))
}

func (r *TenantDB) GetByNPSN(ctx context.Context, npsn string) (*domain.Tenant, error) {
	q := `SELECT ` + tenantColumns + ` FROM tenants WHERE npsn = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, npsn))
}

func (r *TenantDB) GetByID(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	q := `SELECT ` + tenantColumns + ` FROM tenants WHERE tenant_id = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, tenantID))
}

// ============================================
// List (admin)
// ============================================

// ListActive — semua tenant aktif (untuk super admin)
func (r *TenantDB) ListActive(ctx context.Context) ([]domain.Tenant, error) {
	q := `SELECT ` + tenantColumns + `
	     FROM tenants WHERE status = 'ACTIVE' ORDER BY school_name ASC`
	return r.scanMany(ctx, q)
}

// ListPending — untuk approval queue
func (r *TenantDB) ListPending(ctx context.Context) ([]domain.Tenant, error) {
	q := `SELECT ` + tenantColumns + `
	     FROM tenants WHERE status = 'PENDING' ORDER BY created_at ASC`
	return r.scanMany(ctx, q)
}

// ============================================
// Public (landing page) — DTO aman
// ============================================

func (r *TenantDB) ListActivePublic(ctx context.Context) ([]domain.PublicSchoolDTO, error) {
	const q = `
		SELECT subdomain, school_name, npsn, COALESCE(logo_url, '') AS logo_url
		FROM tenants
		WHERE status = 'ACTIVE' AND is_suspended = 0
		ORDER BY school_name ASC
	`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.PublicSchoolDTO
	for rows.Next() {
		var s domain.PublicSchoolDTO
		if err := rows.Scan(&s.Subdomain, &s.SchoolName, &s.NPSN, &s.LogoURL); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// ============================================
// Create
// ============================================

func (r *TenantDB) Create(ctx context.Context, t *domain.Tenant) error {
	// Default status from is_active (backward compat)
	if t.Status == "" {
		if t.IsActive {
			t.Status = domain.TenantStatusActive
		} else {
			t.Status = domain.TenantStatusInactive
		}
	}

	const q = `
		INSERT INTO tenants (
			tenant_id, npsn, subdomain, school_name,
			contact_email, contact_phone, address,
			is_active, is_suspended, db_path, status, logo_url,
			pending_admin_username
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := r.DB.ExecContext(ctx, q,
		t.TenantID, t.NPSN, t.Subdomain, t.SchoolName,
		t.ContactEmail, t.ContactPhone, t.Address,
		boolToInt(t.IsActive), boolToInt(t.IsSuspended),
		t.DBPath, t.Status, t.LogoURL,
		t.PendingAdminUsername,
	)
	if err != nil {
		return fmt.Errorf("create tenant: %w", err)
	}
	return nil
}

// ============================================
// Update
// ============================================

func (r *TenantDB) Update(ctx context.Context, t *domain.Tenant) error {
	const q = `
		UPDATE tenants SET
			school_name = ?, contact_email = ?, contact_phone = ?, address = ?,
			is_active = ?, is_suspended = ?, suspended_reason = ?, logo_url = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE tenant_id = ?`
	_, err := r.DB.ExecContext(ctx, q,
		t.SchoolName, t.ContactEmail, t.ContactPhone, t.Address,
		boolToInt(t.IsActive), boolToInt(t.IsSuspended), t.SuspendReason, t.LogoURL,
		t.TenantID,
	)
	return err
}

// UpdateStatus — approve / reject / generic status change
func (r *TenantDB) UpdateStatus(ctx context.Context, tenantID, status, actorID, reason string) error {
	switch status {
	case domain.TenantStatusActive:
		const q = `
			UPDATE tenants SET
				status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP,
				is_active = 1, updated_at = CURRENT_TIMESTAMP
			WHERE tenant_id = ?`
		_, err := r.DB.ExecContext(ctx, q, status, actorID, tenantID)
		return err

	case domain.TenantStatusRejected:
		const q = `
			UPDATE tenants SET
				status = ?, approved_by = ?, rejected_reason = ?,
				updated_at = CURRENT_TIMESTAMP
			WHERE tenant_id = ?`
		_, err := r.DB.ExecContext(ctx, q, status, actorID, reason, tenantID)
		return err

	default:
		const q = `
			UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE tenant_id = ?`
		_, err := r.DB.ExecContext(ctx, q, status, tenantID)
		return err
	}
}

// ============================================
// Exists checks
// ============================================

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

// ============================================
// Scan helpers
// ============================================

type rowScanner interface {
	Scan(dest ...any) error
}

func (r *TenantDB) scanOne(row rowScanner) (*domain.Tenant, error) {
	t, err := r.scanRowFields(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func (r *TenantDB) scanMany(ctx context.Context, query string, args ...any) ([]domain.Tenant, error) {
	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Tenant
	for rows.Next() {
		t, err := r.scanRowFields(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *TenantDB) scanRowFields(src rowScanner) (*domain.Tenant, error) {
	var t domain.Tenant
	var isActive, isSuspended int
	var createdAt, updatedAt string
	var approvedAt sql.NullString
	var approvedBy, rejectedReason, pendingAdminUsername sql.NullString

	err := src.Scan(
		&t.TenantID, &t.NPSN, &t.Subdomain, &t.SchoolName,
		&t.ContactEmail, &t.ContactPhone, &t.Address,
		&isActive, &isSuspended, &t.SuspendReason,
		&t.DBPath, &t.Status, &t.LogoURL,
		&approvedAt, &approvedBy, &rejectedReason,
		&pendingAdminUsername, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	if pendingAdminUsername.Valid {
		t.PendingAdminUsername = pendingAdminUsername.String
	}
	t.IsActive = isActive == 1
	t.IsSuspended = isSuspended == 1

	if approvedAt.Valid && approvedAt.String != "" {
		parsed := parseTime(approvedAt.String)
		if !parsed.IsZero() {
			t.ApprovedAt = &parsed
		}
	}
	if approvedBy.Valid {
		t.ApprovedBy = approvedBy.String
	}
	if rejectedReason.Valid {
		t.RejectedReason = rejectedReason.String
	}
	t.CreatedAt = parseTime(createdAt)
	t.UpdatedAt = parseTime(updatedAt)

	return &t, nil
}

func parseTime(s string) time.Time {
	// Try RFC3339 first (from Go-inserted values)
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	// Try SQLite CURRENT_TIMESTAMP format
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t
	}
	return time.Time{}
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
