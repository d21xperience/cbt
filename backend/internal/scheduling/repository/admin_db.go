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

func (r *AdminDB) FindByUsername(ctx context.Context, tenantID, username string) (*Admin, error) {
	const q = `SELECT id, tenant_id, username, password_hash, role, is_active
	           FROM admins WHERE tenant_id = ? AND username = ? LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, tenantID, username)
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
