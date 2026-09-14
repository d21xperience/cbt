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
func (r *ExamDB) GetQuestionsByExamID(examID string) ([]domain.Question, error) {
	query := `SELECT id, exam_id, question_text, media_url, options FROM questions WHERE exam_id = ?`
	rows, err := r.DB.Query(query, examID)
	if err != nil {
		return nil, fmt.Errorf("gagal query soal: %w", err)
	}
	defer rows.Close()

	var questions []domain.Question
	for rows.Next() {
		var q domain.Question
		if err := rows.Scan(&q.ID, &q.ExamID, &q.QuestionText, &q.MediaURL, &q.Options); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	return questions, nil
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
