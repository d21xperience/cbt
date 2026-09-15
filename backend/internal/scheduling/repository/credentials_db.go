package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"cbt-engine-service/internal/scheduling/domain"
)

var (
	ErrCredentialNotFound = errors.New("credential_not_found")
	ErrCredentialInactive = errors.New("credential_inactive")
	ErrCredentialExpired  = errors.New("credential_expired")
)

type CredentialsDB struct {
	DB *sql.DB
}

func NewCredentialsDB(db *sql.DB) *CredentialsDB {
	return &CredentialsDB{DB: db}
}

func (r *CredentialsDB) FindByUsername(ctx context.Context, username string) (*domain.ParticipantCredential, error) {
	const q = `
		SELECT nisn, username, password_enc, password_iv, is_active, valid_until, generated_at, generated_by
		FROM participant_credentials
		WHERE username = ? LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, username)

	var c domain.ParticipantCredential
	var isActive int
	var validUntil sql.NullString
	var generatedBy sql.NullString
	var generatedAt string

	err := row.Scan(&c.NISN, &c.Username, &c.PasswordEnc, &c.PasswordIV,
		&isActive, &validUntil, &generatedAt, &generatedBy)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	c.IsActive = isActive == 1
	if validUntil.Valid && validUntil.String != "" {
		t, _ := time.Parse(time.RFC3339, validUntil.String)
		c.ValidUntil = &t
	}
	if generatedBy.Valid {
		c.GeneratedBy = generatedBy.String
	}
	if t, err := time.Parse(time.RFC3339, generatedAt); err == nil {
		c.GeneratedAt = t
	}
	return &c, nil
}

func (r *CredentialsDB) Upsert(ctx context.Context, c *domain.ParticipantCredential) error {
	const q = `
		INSERT INTO participant_credentials
		(nisn, username, password_enc, password_iv, is_active, valid_until, generated_by, generated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(nisn) DO UPDATE SET
		  username = excluded.username,
		  password_enc = excluded.password_enc,
		  password_iv = excluded.password_iv,
		  is_active = excluded.is_active,
		  valid_until = excluded.valid_until,
		  generated_by = excluded.generated_by,
		  generated_at = CURRENT_TIMESTAMP`

	var validUntil any
	if c.ValidUntil != nil {
		validUntil = c.ValidUntil.UTC().Format(time.RFC3339)
	}

	_, err := r.DB.ExecContext(ctx, q,
		c.NISN, c.Username, c.PasswordEnc, c.PasswordIV,
		boolToInt(c.IsActive), validUntil, c.GeneratedBy,
	)
	return err
}

// ListByExamID — ambil semua credential untuk peserta di exam tertentu
func (r *CredentialsDB) ListByExamID(ctx context.Context, examID string) ([]domain.ParticipantCredential, error) {
	const q = `
		SELECT pc.nisn, pc.username, pc.password_enc, pc.password_iv,
		       pc.is_active, pc.valid_until, pc.generated_at, pc.generated_by
		FROM participant_credentials pc
		JOIN eligible_participants ep ON ep.nisn = pc.nisn
		WHERE ep.pembelajaran_id = ?
		GROUP BY pc.nisn`

	rows, err := r.DB.QueryContext(ctx, q, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ParticipantCredential
	for rows.Next() {
		var c domain.ParticipantCredential
		var isActive int
		var validUntil, generatedBy, generatedAt sql.NullString

		if err := rows.Scan(&c.NISN, &c.Username, &c.PasswordEnc, &c.PasswordIV,
			&isActive, &validUntil, &generatedAt, &generatedBy); err != nil {
			return nil, err
		}
		c.IsActive = isActive == 1
		if validUntil.Valid && validUntil.String != "" {
			t, _ := time.Parse(time.RFC3339, validUntil.String)
			c.ValidUntil = &t
		}
		if generatedBy.Valid {
			c.GeneratedBy = generatedBy.String
		}
		if generatedAt.Valid {
			if t, err := time.Parse(time.RFC3339, generatedAt.String); err == nil {
				c.GeneratedAt = t
			}
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ExistsNISN — cek apakah credential sudah ada
func (r *CredentialsDB) ExistsNISN(ctx context.Context, nisn string) (bool, error) {
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM participant_credentials WHERE nisn = ?`, nisn).Scan(&n)
	return n > 0, err
}

// DeleteByNISN — hapus credential
func (r *CredentialsDB) DeleteByNISN(ctx context.Context, nisn string) error {
	_, err := r.DB.ExecContext(ctx,
		`DELETE FROM participant_credentials WHERE nisn = ?`, nisn)
	return err
}

// GetEligibleExamsByNISN — return participant_id (UUID) + exam_ids + nama
func (r *CredentialsDB) GetEligibleExamsByNISN(ctx context.Context, nisn string) (
	participantID string, exams []string, name string, rombel string, err error,
) {
	const q = `
		SELECT participant_id, pembelajaran_id, name, COALESCE(rombel_name, '')
		FROM eligible_participants
		WHERE nisn = ?
		ORDER BY pembelajaran_id ASC`

	rows, err := r.DB.QueryContext(ctx, q, nisn)
	if err != nil {
		return "", nil, "", "", err
	}
	defer rows.Close()

	first := true
	for rows.Next() {
		var pid, examID, nm, rb string
		if err := rows.Scan(&pid, &examID, &nm, &rb); err != nil {
			return "", nil, "", "", err
		}
		exams = append(exams, examID)
		if first {
			participantID = pid
			name = nm
			rombel = rb
			first = false
		}
	}
	return participantID, exams, name, rombel, rows.Err()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
func (r *CredentialsDB) ListNISNByExam(ctx context.Context, examID string) ([]string, error) {
	const q = `SELECT DISTINCT nisn FROM eligible_participants WHERE pembelajaran_id = ? AND nisn != ''`
	rows, err := r.DB.QueryContext(ctx, q, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}
