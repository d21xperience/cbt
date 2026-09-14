package repository

import (
	"cbt-engine-service/internal/cbt/domain"
	"context"
)

// QuestionRepository untuk mengambil bank soal
type QuestionRepository interface {
	GetQuestionsByExamID(examID string) ([]domain.Question, error)
	BatchInsertQuestions(ctx context.Context, batch []domain.Question) error
}

// AnswerRepository untuk buffer jawaban real-time (Redis)
type AnswerRepository interface {
	SaveAnswer(participantID, examID string, answer domain.ParticipantAnswer) error
	GetAnswers(participantID, examID string) (map[string]domain.ParticipantAnswer, error)
	ClearAnswers(participantID, examID string) error
}

// ResultRepository untuk menyimpan nilai akhir (SQLite)
type ResultRepository interface {
	SaveResult(result *domain.ExamResult) error
}

type GradingQueueRepository interface {
	EnqueueEssayGrading(payload domain.EssayGradingPayload) error
}
