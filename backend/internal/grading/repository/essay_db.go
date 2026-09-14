package repository

import (
	"database/sql"
	"log"
)

type GradingDB struct {
	DB *sql.DB
}

func NewGradingDB(db *sql.DB) *GradingDB {
	return &GradingDB{DB: db}
}

// SaveEssayScore menyimpan atau mengupdate nilai esai yang sudah dikoreksi
func (r *GradingDB) SaveEssayScore(participantID, examID, questionID string, score float64) error {
	query := `INSERT INTO essay_scores (participant_id, exam_id, question_id, score, graded_at)
			  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
			  ON CONFLICT(participant_id, exam_id, question_id) DO UPDATE SET 
			  score = excluded.score, graded_at = CURRENT_TIMESTAMP`

	_, err := r.DB.Exec(query, participantID, examID, questionID, score)
	if err != nil {
		log.Printf("[GRADING DB] Error saving essay score: %v", err)
	}
	return err
}
