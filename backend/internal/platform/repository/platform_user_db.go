package repository

import (
	"context"
	"database/sql"
	"time"

	"cbt-engine-service/internal/platform/domain"
)

type PlatformUserDB struct {
	DB *sql.DB
}

func NewPlatformUserDB(db *sql.DB) *PlatformUserDB {
	return &PlatformUserDB{DB: db}
}

func (r *PlatformUserDB) FindByUsername(ctx context.Context, username string) (*domain.PlatformUser, error) {
	const q = `
		SELECT id, username, password_hash, role, full_name, is_active, created_at
		FROM platform_users WHERE username = ? AND is_active = 1 LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, username)

	var u domain.PlatformUser
	var isActive int
	var createdAt string
	var fullName sql.NullString

	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role,
		&fullName, &isActive, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	u.IsActive = isActive == 1
	if fullName.Valid {
		u.FullName = fullName.String
	}
	u.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	return &u, nil
}

func (r *PlatformUserDB) Upsert(ctx context.Context, u *domain.PlatformUser) error {
	const q = `
		INSERT INTO platform_users (id, username, password_hash, role, full_name, is_active)
		VALUES (?, ?, ?, ?, ?, 1)
		ON CONFLICT(username) DO UPDATE SET
		  password_hash = excluded.password_hash,
		  role = excluded.role,
		  full_name = excluded.full_name,
		  is_active = 1,
		  updated_at = CURRENT_TIMESTAMP`
	_, err := r.DB.ExecContext(ctx, q, u.ID, u.Username, u.PasswordHash, u.Role, u.FullName)
	return err
}
