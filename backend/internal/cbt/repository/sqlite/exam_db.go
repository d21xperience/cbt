// internal/repository/sqlite/exam_db.go
package sqlite

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

type ExamDB struct {
	DB *sql.DB
}

func NewExamDB(db *sql.DB) *ExamDB {
	return &ExamDB{DB: db}
}

// GetQuestionsByExamID mengambil soal untuk ujian tertentu.
// Ini akan di-cache di memory/Redis, tapi ini adalah sumber aslinya.
// GetQuestionsByExamID — FIXED: ambil SEMUA kolom yang dibutuhkan grading
func (r *ExamDB) GetQuestionsByExamID(examID string) ([]domain.Question, error) {
	const query = `
		SELECT id, exam_id, question_text,
		       COALESCE(media_url, ''),
		       COALESCE(options, '{}'),
		       COALESCE(correct_option, ''),
		       COALESCE(question_type, 'PG'),
		       COALESCE(score, 10),
		       COALESCE(rubric, '')
		FROM questions
		WHERE exam_id = ?
		ORDER BY id`

	rows, err := r.DB.Query(query, examID)
	if err != nil {
		return nil, fmt.Errorf("gagal query soal: %w", err)
	}
	defer rows.Close()

	var questions []domain.Question
	for rows.Next() {
		var q domain.Question
		if err := rows.Scan(
			&q.ID, &q.ExamID, &q.QuestionText,
			&q.MediaURL, &q.Options, &q.CorrectOption,
			&q.QuestionType, &q.Score, &q.Rubric,
		); err != nil {
			return nil, fmt.Errorf("gagal scan soal: %w", err)
		}
		questions = append(questions, q)
	}
	return questions, rows.Err()
}

// SaveResult menyimpan nilai akhir ke SQLite (dilakukan saat submit final)
func (r *ExamDB) SaveResult(result *domain.ExamResult) error {
	query := `INSERT INTO exam_results (participant_id, exam_id, total_questions, correct_answers, final_score, status, submitted_at) 
			  VALUES (?, ?, ?, ?, ?, ?, ?)
			  ON CONFLICT(participant_id, exam_id) DO UPDATE SET 
			  correct_answers = excluded.correct_answers, 
			  final_score = excluded.final_score, 
			  status = excluded.status, 
			  submitted_at = excluded.submitted_at`

	_, err := r.DB.Exec(query,
		result.ParticipantID, result.ExamID, result.TotalQuestions,
		result.CorrectAnswers, result.FinalScore, result.Status, result.SubmittedAt)

	return err
}

// BatchInsertQuestions menyisikkan 1 batch soal ke SQLite secara massal
func (r *ExamDB) BatchInsertQuestions(ctx context.Context, batch []domain.Question) error {
	if len(batch) == 0 {
		return nil
	}

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("gagal begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO questions (id, exam_id, question_text, media_url, options, correct_option) 
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET 
		question_text = excluded.question_text, media_url = excluded.media_url, 
		options = excluded.options, correct_option = excluded.correct_option
	`)
	if err != nil {
		return fmt.Errorf("gagal prepare stmt: %w", err)
	}
	defer stmt.Close()

	for i := range batch {
		q := &batch[i]
		if q.ID == "" {
			q.ID = uuid.NewString() // Generate UUID otomatis jika kosong
		}

		_, err := stmt.ExecContext(ctx, q.ID, q.ExamID, q.QuestionText, q.MediaURL, q.Options, q.CorrectOption)
		if err != nil {
			return fmt.Errorf("gagal insert soal: %w", err)
		}
	}

	return tx.Commit()
}

// InvalidateQuestionCache menghapus cache In-Memory jika ada soal yang di-update/import ulang
func (r *ExamDB) InvalidateQuestionCache(examID string) error {
	// Karena cache ada di UseCase, kita butuh interface atau callback.
	// Untuk simplicity, kita akan handle invalidasi cache langsung di UseCase.
	return nil
}

// ============================================
// PHASE 5: Participant Exam List & History
// ============================================

// ParticipantExam — DTO untuk daftar ujian peserta
type ParticipantExam struct {
	ExamID          string `json:"exam_id"`
	SessionID       string `json:"session_id"`
	Title           string `json:"title"`
	DurationMinutes int    `json:"duration_minutes"`
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
	SessionStatus   string `json:"session_status"` // SCHEDULED | ACTIVE | CLOSED
	SessionType     string `json:"session_type"`
	ParticipantStat string `json:"participant_status"` // ELIGIBLE | IN_PROGRESS | COMPLETED
}

// GetParticipantExams — daftar ujian yang eligible untuk peserta (JOIN 3 tabel)
func (r *ExamDB) GetParticipantExams(ctx context.Context, participantID string) ([]ParticipantExam, error) {
	const q = `
		SELECT e.id, es.id, e.title, e.duration_minutes,
		       es.start_time, es.end_time, es.status, es.session_type,
		       ps.status
		FROM exams e
		JOIN exam_sessions es ON es.exam_id = e.id
		JOIN participant_sessions ps ON ps.session_id = es.id
		WHERE ps.participant_id = ?
		  AND es.status != 'CLOSED'
		ORDER BY es.start_time ASC`

	rows, err := r.DB.QueryContext(ctx, q, participantID)
	if err != nil {
		return nil, fmt.Errorf("query participant exams: %w", err)
	}
	defer rows.Close()

	var out []ParticipantExam
	for rows.Next() {
		var p ParticipantExam
		if err := rows.Scan(
			&p.ExamID, &p.SessionID, &p.Title, &p.DurationMinutes,
			&p.StartTime, &p.EndTime, &p.SessionStatus, &p.SessionType,
			&p.ParticipantStat,
		); err != nil {
			return nil, fmt.Errorf("scan participant exam: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// GetParticipantHistory — riwayat ujian yang sudah dikerjakan
func (r *ExamDB) GetParticipantHistory(ctx context.Context, participantID string) ([]map[string]any, error) {
	const q = `
		SELECT er.exam_id, e.title, er.total_questions, er.correct_answers,
		       er.final_score, er.status, er.submitted_at
		FROM exam_results er
		LEFT JOIN exams e ON e.id = er.exam_id
		WHERE er.participant_id = ?
		ORDER BY er.submitted_at DESC`

	rows, err := r.DB.QueryContext(ctx, q, participantID)
	if err != nil {
		return nil, fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	var out []map[string]any
	for rows.Next() {
		var (
			examID, title, status, submittedAt string
			totalQ, correctQ                   int
			finalScore                         float64
		)
		if err := rows.Scan(&examID, &title, &totalQ, &correctQ, &finalScore, &status, &submittedAt); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"exam_id":         examID,
			"title":           title,
			"total_questions": totalQ,
			"correct_answers": correctQ,
			"final_score":     finalScore,
			"status":          status,
			"submitted_at":    submittedAt,
		})
	}
	return out, rows.Err()
}

// ListExams mengambil daftar ujian berdasarkan periode akademik.
func (r *ExamDB) ListExams(periodID string) ([]domain.Exam, error) {
	q := `SELECT id, title, duration_minutes, start_time, end_time, COALESCE(subject_id,''), COALESCE(class_id,''), COALESCE(jenis_ujian_id,''), COALESCE(academic_period_id,''), COALESCE(tenant_id,'default') 
	      FROM exams 
	      WHERE academic_period_id = ? OR (academic_period_id IS NULL AND ? = '')
	      ORDER BY title ASC`
	rows, err := r.DB.Query(q, periodID, periodID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []domain.Exam
	for rows.Next() {
		var e domain.Exam
		rows.Scan(&e.ID, &e.Title, &e.DurationMinutes, &e.StartTime, &e.EndTime, &e.SubjectID, &e.ClassID, &e.JenisUjianID, &e.AcademicPeriodID, &e.TenantID)
		list = append(list, e)
	}
	return list, nil
}

// FindOrCreate mencari ujian berdasarkan kombinasi, jika tidak ada maka buat baru.
func (r *ExamDB) FindOrCreate(ctx context.Context, e *domain.Exam) (*domain.Exam, error) {
	const q = `SELECT id, title, duration_minutes, start_time, end_time, COALESCE(subject_id,''), COALESCE(class_id,''), COALESCE(jenis_ujian_id,''), COALESCE(academic_period_id,''), COALESCE(tenant_id,'default') 
	           FROM exams WHERE subject_id = ? AND class_id = ? AND jenis_ujian_id = ? AND academic_period_id = ? LIMIT 1`
	var res domain.Exam
	err := r.DB.QueryRowContext(ctx, q, e.SubjectID, e.ClassID, e.JenisUjianID, e.AcademicPeriodID).Scan(
		&res.ID, &res.Title, &res.DurationMinutes, &res.StartTime, &res.EndTime, &res.SubjectID, &res.ClassID, &res.JenisUjianID, &res.AcademicPeriodID, &res.TenantID)

	if err == nil {
		return &res, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	// Create new
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	const insertQ = `INSERT INTO exams (id, title, duration_minutes, start_time, end_time, subject_id, class_id, jenis_ujian_id, academic_period_id, tenant_id) 
	                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = r.DB.ExecContext(ctx, insertQ, e.ID, e.Title, e.DurationMinutes, e.StartTime, e.EndTime, e.SubjectID, e.ClassID, e.JenisUjianID, e.AcademicPeriodID, e.TenantID)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *ExamDB) DeleteExam(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM exams WHERE id = ?`, id)
	return err
}
