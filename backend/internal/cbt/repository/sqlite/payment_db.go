package sqlite

import (
	"context"
	"database/sql"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

type PaymentDB struct {
	DB *sql.DB
}

func NewPaymentDB(db *sql.DB) *PaymentDB {
	return &PaymentDB{DB: db}
}

// IsBlocked — cek cepat, return bool + reason
func (r *PaymentDB) IsBlocked(ctx context.Context, nisn string) (bool, string, error) {
	var isBlocked int
	var reason sql.NullString
	err := r.DB.QueryRowContext(ctx,
		`SELECT is_blocked, reason FROM payment_gates WHERE nisn = ? LIMIT 1`,
		nisn).Scan(&isBlocked, &reason)
	if err == sql.ErrNoRows {
		return false, "", nil
	}
	if err != nil {
		return false, "", err
	}
	return isBlocked == 1, reason.String, nil
}

// Block — block siswa
func (r *PaymentDB) Block(ctx context.Context, nisn, reason, by, note string) error {
	const q = `
		INSERT INTO payment_gates (nisn, is_blocked, reason, source, blocked_by, blocked_at, note)
		VALUES (?, 1, ?, 'MANUAL', ?, CURRENT_TIMESTAMP, ?)
		ON CONFLICT(nisn) DO UPDATE SET
		  is_blocked = 1, reason = excluded.reason, source = 'MANUAL',
		  blocked_by = excluded.blocked_by, blocked_at = CURRENT_TIMESTAMP,
		  note = excluded.note, unblocked_by = NULL, unblocked_at = NULL`
	_, err := r.DB.ExecContext(ctx, q, nisn, reason, by, note)
	return err
}

// Unblock — unblock siswa
func (r *PaymentDB) Unblock(ctx context.Context, nisn, by, note string) error {
	const q = `
		UPDATE payment_gates SET
		  is_blocked = 0, unblocked_by = ?, unblocked_at = CURRENT_TIMESTAMP, note = ?
		WHERE nisn = ?`
	_, err := r.DB.ExecContext(ctx, q, by, note, nisn)
	return err
}

// ListBlocked — semua siswa yang sedang blocked
func (r *PaymentDB) ListBlocked(ctx context.Context) ([]domain.PaymentGate, error) {
	rows, err := r.DB.QueryContext(ctx, `
		SELECT nisn, is_blocked, COALESCE(reason,''), source,
		       COALESCE(blocked_by,''), blocked_at, COALESCE(unblocked_by,''), unblocked_at, COALESCE(note,'')
		FROM payment_gates
		WHERE is_blocked = 1
		ORDER BY blocked_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.PaymentGate
	for rows.Next() {
		var g domain.PaymentGate
		var blockedAt, unblockedAt sql.NullString
		if err := rows.Scan(&g.NISN, &g.IsBlocked, &g.Reason, &g.Source,
			&g.BlockedBy, &blockedAt, &g.UnblockedBy, &unblockedAt, &g.Note); err != nil {
			return nil, err
		}
		if blockedAt.Valid {
			t, _ := time.Parse("2006-01-02 15:04:05", blockedAt.String)
			g.BlockedAt = &t
		}
		if unblockedAt.Valid {
			t, _ := time.Parse("2006-01-02 15:04:05", unblockedAt.String)
			g.UnblockedAt = &t
		}
		out = append(out, g)
	}
	return out, rows.Err()
}
