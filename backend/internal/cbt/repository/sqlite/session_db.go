package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

type SessionDB struct {
	DB *sql.DB
}

func NewSessionDB(db *sql.DB) *SessionDB {
	return &SessionDB{DB: db}
}

func (r *SessionDB) CreateSession(ctx context.Context, s *domain.ExamSession) error {
	const q = `
		INSERT INTO exam_sessions (id, exam_id, semester_id, session_type, start_time, end_time, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
		  session_type = excluded.session_type,
		  start_time = excluded.start_time,
		  end_time = excluded.end_time,
		  status = excluded.status`
	_, err := r.DB.ExecContext(ctx, q,
		s.ID, s.ExamID, s.SemesterID, string(s.SessionType),
		s.StartTime.UTC().Format(time.RFC3339),
		s.EndTime.UTC().Format(time.RFC3339),
		s.Status,
	)
	return err
}

func (r *SessionDB) GetSessionByID(ctx context.Context, sessionID string) (*domain.ExamSession, error) {
	const q = `
		SELECT id, exam_id, semester_id, session_type, start_time, end_time, status, created_at
		FROM exam_sessions WHERE id = ? LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, sessionID))
}

func (r *SessionDB) GetActiveSessionByExam(ctx context.Context, examID string) (*domain.ExamSession, error) {
	const q = `
		SELECT id, exam_id, semester_id, session_type, start_time, end_time, status, created_at
		FROM exam_sessions
		WHERE exam_id = ? AND status != 'CLOSED'
		ORDER BY start_time ASC LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, examID))
}

func (r *SessionDB) ListSessionsByExam(ctx context.Context, examID string) ([]domain.ExamSession, error) {
	const q = `
		SELECT id, exam_id, semester_id, session_type, start_time, end_time, status, created_at
		FROM exam_sessions WHERE exam_id = ? ORDER BY start_time ASC`
	rows, err := r.DB.QueryContext(ctx, q, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ExamSession
	for rows.Next() {
		s, err := r.scanRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *SessionDB) UpdateSessionStatus(ctx context.Context, sessionID, status string) error {
	_, err := r.DB.ExecContext(ctx,
		`UPDATE exam_sessions SET status = ? WHERE id = ?`, status, sessionID)
	return err
}

func (r *SessionDB) AssignParticipantToSession(ctx context.Context, participantID, sessionID string) error {
	const q = `
		INSERT INTO participant_sessions (participant_id, session_id, status)
		VALUES (?, ?, 'ELIGIBLE')
		ON CONFLICT(participant_id, session_id) DO NOTHING`
	_, err := r.DB.ExecContext(ctx, q, participantID, sessionID)
	return err
}

// GetParticipantSession — cari sesi aktif peserta untuk exam tertentu
func (r *SessionDB) GetParticipantSession(ctx context.Context, participantID, examID string) (*domain.ExamSession, error) {
	const q = `
		SELECT es.id, es.exam_id, es.semester_id, es.session_type,
		       es.start_time, es.end_time, es.status, es.created_at
		FROM exam_sessions es
		JOIN participant_sessions ps ON ps.session_id = es.id
		WHERE ps.participant_id = ? AND es.exam_id = ?
		  AND es.status != 'CLOSED'
		ORDER BY es.start_time ASC LIMIT 1`
	return r.scanOne(r.DB.QueryRowContext(ctx, q, participantID, examID))
}

func (r *SessionDB) MarkParticipantStarted(ctx context.Context, participantID, sessionID string) error {
	_, err := r.DB.ExecContext(ctx,
		`UPDATE participant_sessions SET status = 'IN_PROGRESS'
		 WHERE participant_id = ? AND session_id = ?`, participantID, sessionID)
	return err
}

func (r *SessionDB) MarkParticipantSubmitted(ctx context.Context, participantID, sessionID string) error {
	_, err := r.DB.ExecContext(ctx,
		`UPDATE participant_sessions SET status = 'COMPLETED'
		 WHERE participant_id = ? AND session_id = ?`, participantID, sessionID)
	return err
}

// ============ HELPERS ============

type rowScanner interface {
	Scan(dest ...any) error
}

func (r *SessionDB) scanOne(row rowScanner) (*domain.ExamSession, error) {
	var s domain.ExamSession
	var startStr, endStr, createdStr string
	err := row.Scan(&s.ID, &s.ExamID, &s.SemesterID, &s.SessionType,
		&startStr, &endStr, &s.Status, &createdStr)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.parseTimes(&s, startStr, endStr, createdStr)
}

func (r *SessionDB) scanRow(rows *sql.Rows) (*domain.ExamSession, error) {
	var s domain.ExamSession
	var startStr, endStr, createdStr string
	if err := rows.Scan(&s.ID, &s.ExamID, &s.SemesterID, &s.SessionType,
		&startStr, &endStr, &s.Status, &createdStr); err != nil {
		return nil, err
	}
	return r.parseTimes(&s, startStr, endStr, createdStr)
}

func (r *SessionDB) parseTimes(s *domain.ExamSession, startStr, endStr, createdStr string) (*domain.ExamSession, error) {
	var err error
	if s.StartTime, err = time.Parse(time.RFC3339, startStr); err != nil {
		return nil, fmt.Errorf("parse start_time: %w", err)
	}
	if s.EndTime, err = time.Parse(time.RFC3339, endStr); err != nil {
		return nil, fmt.Errorf("parse end_time: %w", err)
	}
	if createdStr != "" {
		s.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
	}
	return s, nil
}

// ListSessions — untuk proctor panel. activeOnly=true → hanya sesi yang sedang berjalan.
func (r *SessionDB) ListSessions(ctx context.Context, examID string, activeOnly bool) ([]domain.SessionListItem, error) {
	now := time.Now().Format(time.RFC3339)
	var (
		args []any
		q    string
	)
	base := `
		SELECT
			es.id, es.exam_id,
			COALESCE(s.nama, '') AS subject_nama,
			COALESCE(c.nama, '') AS class_nama,
			COALESCE((SELECT r.nama FROM exam_schedules sch
					  JOIN rooms r ON r.id = sch.ruang_id
					  WHERE sch.lesson_id IN (SELECT id FROM lessons WHERE subject_id = e.subject_id AND class_id = e.class_id)
					  AND sch.jenis_ujian_id = e.jenis_ujian_id
					  AND sch.academic_period_id = e.academic_period_id
					  AND sch.tanggal = SUBSTR(es.start_time, 1, 10)
					  LIMIT 1), '') AS ruang_nama,
			SUBSTR(es.start_time, 1, 10) AS tanggal,
			SUBSTR(es.start_time, 12, 5) AS jam_mulai,
			COALESCE(e.duration_minutes, 0) AS durasi_menit,
			es.status,
			COALESCE((SELECT token FROM exam_tokens WHERE session_id = es.id AND is_active = 1 LIMIT 1), '') AS token,
			(SELECT COUNT(*) FROM participant_sessions WHERE session_id = es.id) AS participant_count,
			(SELECT COUNT(*) FROM participant_sessions WHERE session_id = es.id AND status = 'COMPLETED') AS completed_count
		FROM exam_sessions es
		LEFT JOIN exams e ON e.id = es.exam_id
		LEFT JOIN subjects s ON s.id = e.subject_id
		LEFT JOIN classes c ON c.id = e.class_id
		WHERE 1=1`
	if examID != "" {
		base += ` AND es.exam_id = ?`
		args = append(args, examID)
	}
	if activeOnly {
		base += ` AND es.start_time <= ? AND es.end_time > ? AND es.status != 'CLOSED'`
		args = append(args, now, now)
	}
	base += ` ORDER BY es.start_time DESC LIMIT 100`
	q = base
	rows, err := r.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.SessionListItem
	for rows.Next() {
		var s domain.SessionListItem
		if err := rows.Scan(
			&s.ID, &s.ExamID,
			&s.SubjectNama, &s.ClassNama, &s.RuangNama,
			&s.Tanggal, &s.JamMulai, &s.DurasiMenit,
			&s.Status, &s.Token,
			&s.ParticipantCount, &s.CompletedCount,
		); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// UpdateSessionStartAndStatus menggeser start_time dan end_time berdasarkan durasi ujian, lalu mengubah status.
func (r *SessionDB) UpdateSessionStartAndStatus(ctx context.Context, sessionID, status string) error {
	var duration int
	err := r.DB.QueryRowContext(ctx, `
		SELECT e.duration_minutes 
		FROM exam_sessions es 
		JOIN exams e ON e.id = es.exam_id 
		WHERE es.id = ?`, sessionID).Scan(&duration)
	if err != nil {
		return err
	}

	// Gunakan zona waktu lokal (WIB) agar sinkron dengan UI
	now := time.Now()
	endTime := now.Add(time.Duration(duration) * time.Minute)

	// SQLite menggunakan format standar RFC3339
	startStr := now.Format(time.RFC3339)
	endStr := endTime.Format(time.RFC3339)

	_, err = r.DB.ExecContext(ctx,
		`UPDATE exam_sessions SET start_time = ?, end_time = ?, status = ? WHERE id = ?`,
		startStr, endStr, status, sessionID)

	// Opsional: Update juga tabel exams agar sinkron
	_, _ = r.DB.ExecContext(ctx,
		`UPDATE exams SET start_time = ?, end_time = ? WHERE id = (SELECT exam_id FROM exam_sessions WHERE id = ?)`,
		startStr, endStr, sessionID)

	return err
}
