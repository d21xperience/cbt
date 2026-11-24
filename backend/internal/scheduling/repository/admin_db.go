package repository

import (
	"context"
	"database/sql"
)

type Admin struct {
	ID           string
	TenantID     string
	Username     string
	PasswordHash string
	Role         string
	IsActive     bool
}

type AdminDB struct {
	DB *sql.DB
}

func NewAdminDB(db *sql.DB) *AdminDB {
	return &AdminDB{DB: db}
}

// FindByUsername — cari berdasarkan (tenant_id, username).
func (r *AdminDB) FindByUsername(ctx context.Context, tenantID, username string) (*Admin, error) {
	const q = `SELECT id, tenant_id, username, password_hash, role, is_active
	           FROM admins WHERE tenant_id = ? AND username = ? LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, tenantID, username)
	return scanAdmin(row)
}

// FindByUsernameAnyTenant — cari berdasarkan username saja (lintas tenant).
// Berguna untuk fallback platform DB: superadmin reset password lintas tenant.
func (r *AdminDB) FindByUsernameAnyTenant(ctx context.Context, username string) (*Admin, error) {
	const q = `SELECT id, tenant_id, username, password_hash, role, is_active
	           FROM admins WHERE username = ? ORDER BY created_at DESC LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, username)
	return scanAdmin(row)
}

// Upsert — insert atau update admin.
func (r *AdminDB) Upsert(ctx context.Context, a *Admin) error {
	const q = `INSERT INTO admins (id, tenant_id, username, password_hash, role, is_active)
	           VALUES (?, ?, ?, ?, ?, 1)
	           ON CONFLICT(tenant_id, username) DO UPDATE SET
	             password_hash = excluded.password_hash,
	             role = excluded.role,
	             is_active = 1,
	             updated_at = CURRENT_TIMESTAMP`
	_, err := r.DB.ExecContext(ctx, q, a.ID, a.TenantID, a.Username, a.PasswordHash, a.Role)
	return err
}

// ResetPassword — update password_hash admin.
func (r *AdminDB) ResetPassword(ctx context.Context, tenantID, username, newHash string) error {
	const q = `UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
	           WHERE tenant_id = ? AND username = ?`
	res, err := r.DB.ExecContext(ctx, q, newHash, tenantID, username)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ListByTenant — list semua admin dalam satu tenant.
func (r *AdminDB) ListByTenant(ctx context.Context, tenantID string) ([]Admin, error) {
	const q = `SELECT id, tenant_id, username, password_hash, role, is_active
	           FROM admins WHERE tenant_id = ? ORDER BY username ASC`
	rows, err := r.DB.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Admin
	for rows.Next() {
		var a Admin
		var active int
		if err := rows.Scan(&a.ID, &a.TenantID, &a.Username, &a.PasswordHash, &a.Role, &active); err != nil {
			return nil, err
		}
		a.IsActive = active == 1
		out = append(out, a)
	}
	return out, rows.Err()
}

// scanAdmin — helper.
func scanAdmin(row *sql.Row) (*Admin, error) {
	var a Admin
	var active int
	err := row.Scan(&a.ID, &a.TenantID, &a.Username, &a.PasswordHash, &a.Role, &active)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	a.IsActive = active == 1
	return &a, nil
}
