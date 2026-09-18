package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

type TokenDB struct {
	DB *sql.DB
}

func NewTokenDB(db *sql.DB) *TokenDB {
	return &TokenDB{DB: db}
}

// CreateAndDeactivateOld — insert token baru, matikan yang lama (atomic)
func (r *TokenDB) CreateAndDeactivateOld(ctx context.Context, t *domain.ExamToken) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Deactivate old tokens for this session
	if _, err := tx.ExecContext(ctx,
		`UPDATE exam_tokens SET is_active = 0 WHERE session_id = ? AND is_active = 1`,
		t.SessionID); err != nil {
		return err
	}

	// Insert new
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO exam_tokens (id, session_id, token, valid_from, valid_until, is_active, generated_by, generated_at)
		VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
		t.ID, t.SessionID, t.Token,
		t.ValidFrom.UTC().Format(time.RFC3339),
		t.ValidUntil.UTC().Format(time.RFC3339),
		t.GeneratedBy,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// FindActiveBySession — token yang sedang aktif untuk session tertentu
func (r *TokenDB) FindActiveBySession(ctx context.Context, sessionID string) (*domain.ExamToken, error) {
	row := r.DB.QueryRowContext(ctx, `
		SELECT id, session_id, token, valid_from, valid_until, is_active, generated_by, generated_at
		FROM exam_tokens
		WHERE session_id = ? AND is_active = 1
		ORDER BY generated_at DESC LIMIT 1`, sessionID)
	return r.scanRow(row)
}

// FindBySessionAndToken — cek apakah token tertentu pernah/sedang valid
func (r *TokenDB) FindBySessionAndToken(ctx context.Context, sessionID, token string) (*domain.ExamToken, error) {
	row := r.DB.QueryRowContext(ctx, `
		SELECT id, session_id, token, valid_from, valid_until, is_active, generated_by, generated_at
		FROM exam_tokens
		WHERE session_id = ? AND token = ?
		ORDER BY generated_at DESC LIMIT 1`, sessionID, token)
	return r.scanRow(row)
}

func (r *TokenDB) scanRow(row *sql.Row) (*domain.ExamToken, error) {
	var t domain.ExamToken
	var vf, vu, ga string
	var isActive int
	var genBy sql.NullString

	err := row.Scan(&t.ID, &t.SessionID, &t.Token, &vf, &vu, &isActive, &genBy, &ga)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	t.IsActive = isActive == 1
	if genBy.Valid {
		t.GeneratedBy = genBy.String
	}
	if t.ValidFrom, err = time.Parse(time.RFC3339, vf); err != nil {
		return nil, fmt.Errorf("parse valid_from: %w", err)
	}
	if t.ValidUntil, err = time.Parse(time.RFC3339, vu); err != nil {
		return nil, fmt.Errorf("parse valid_until: %w", err)
	}
	t.GeneratedAt, _ = time.Parse(time.RFC3339, ga)
	return &t, nil
}
