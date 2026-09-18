package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/scheduling/domain"

	"github.com/google/uuid"
)

type ProctorDB struct {
	DB *sql.DB
}

func NewProctorDB(db *sql.DB) *ProctorDB {
	return &ProctorDB{DB: db}
}

// Assign — idempotent, insert jika belum ada
func (r *ProctorDB) Assign(ctx context.Context, a *domain.ProctorAssignment) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	const q = `
		INSERT INTO proctor_assignments (id, proctor_id, session_id, class_name, assigned_by, assigned_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(proctor_id, session_id, class_name) DO NOTHING`
	_, err := r.DB.ExecContext(ctx, q, a.ID, a.ProctorID, a.SessionID, a.ClassName, a.AssignedBy)
	return err
}

// ListByProctor — semua sesi yang di-assign ke proctor tertentu
func (r *ProctorDB) ListByProctor(ctx context.Context, proctorID string) ([]domain.ProctorSessionView, error) {
	const q = `
		SELECT pa.session_id, es.exam_id, COALESCE(e.title, es.exam_id),
		       es.session_type, es.start_time, es.end_time, es.status,
		       COALESCE(pa.class_name, ''),
		       COALESCE((SELECT COUNT(*) FROM participant_sessions ps WHERE ps.session_id = es.id), 0)
		FROM proctor_assignments pa
		JOIN exam_sessions es ON es.id = pa.session_id
		LEFT JOIN exams e ON e.id = es.exam_id
		WHERE pa.proctor_id = ?
		ORDER BY es.start_time DESC
		LIMIT 200`

	rows, err := r.DB.QueryContext(ctx, q, proctorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ProctorSessionView
	for rows.Next() {
		var s domain.ProctorSessionView
		if err := rows.Scan(&s.SessionID, &s.ExamID, &s.ExamTitle,
			&s.SessionType, &s.StartTime, &s.EndTime, &s.Status,
			&s.ClassName, &s.StudentCount); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// IsProctorAssigned — cek apakah proctor di-assign ke sesi tertentu
func (r *ProctorDB) IsProctorAssigned(ctx context.Context, proctorID, sessionID string) (bool, error) {
	var n int
	err := r.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM proctor_assignments WHERE proctor_id = ? AND session_id = ?`,
		proctorID, sessionID).Scan(&n)
	return n > 0, err
}

// ListBySession — semua proctor di sesi tertentu (untuk admin view)
func (r *ProctorDB) ListBySession(ctx context.Context, sessionID string) ([]domain.ProctorAssignment, error) {
	const q = `
		SELECT id, proctor_id, session_id, COALESCE(class_name, ''), COALESCE(assigned_by, ''), assigned_at
		FROM proctor_assignments WHERE session_id = ?`
	rows, err := r.DB.QueryContext(ctx, q, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ProctorAssignment
	for rows.Next() {
		var a domain.ProctorAssignment
		var assignedAt string
		if err := rows.Scan(&a.ID, &a.ProctorID, &a.SessionID, &a.ClassName, &a.AssignedBy, &assignedAt); err != nil {
			return nil, err
		}
		a.AssignedAt, _ = time.Parse(time.RFC3339, assignedAt)
		out = append(out, a)
	}
	return out, rows.Err()
}

// Unassign
func (r *ProctorDB) Unassign(ctx context.Context, proctorID, sessionID string) error {
	_, err := r.DB.ExecContext(ctx,
		`DELETE FROM proctor_assignments WHERE proctor_id = ? AND session_id = ?`,
		proctorID, sessionID)
	return err
}

// ListAllProctors — list user dengan role PROCTOR atau TEACHER
func (r *ProctorDB) ListAllProctors(ctx context.Context) ([]map[string]any, error) {
	const q = `
		SELECT id, username, role, tenant_id
		FROM admins
		WHERE role IN ('PROCTOR', 'TEACHER') AND is_active = 1
		ORDER BY username ASC`
	rows, err := r.DB.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []map[string]any
	for rows.Next() {
		var id, username, role, tenantID string
		if err := rows.Scan(&id, &username, &role, &tenantID); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id":        id,
			"username":  username,
			"role":      role,
			"tenant_id": tenantID,
		})
	}
	return out, rows.Err()
}

// FindProctorByUsername — untuk login proctor
func (r *ProctorDB) FindProctorByUsername(ctx context.Context, tenantID, username string) (id, passwordHash, role string, err error) {
	const q = `SELECT id, password_hash, role FROM admins
	           WHERE tenant_id = ? AND username = ? AND role IN ('PROCTOR', 'TEACHER') AND is_active = 1
	           LIMIT 1`
	row := r.DB.QueryRowContext(ctx, q, tenantID, username)
	err = row.Scan(&id, &passwordHash, &role)
	if err == sql.ErrNoRows {
		return "", "", "", nil
	}
	return
}

// helper untuk error wrapping
func wrapErr(op string, err error) error {
	return fmt.Errorf("%s: %w", op, err)
}
