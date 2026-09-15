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
	SaveAnswersBatch(participantID, examID string, answers []domain.ParticipantAnswer) error
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

type SessionListItem struct {
	ID           string `json:"id"`
	ExamID       string `json:"exam_id"`
	ExamTitle    string `json:"exam_title"`
	SessionType  string `json:"session_type"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	Status       string `json:"status"`
	HasActiveTok bool   `json:"has_active_token"`
}

// SessionRepository untuk sesi ujian (REGULER / SUSULAN)
type SessionRepository interface {
	CreateSession(ctx context.Context, s *domain.ExamSession) error
	GetSessionByID(ctx context.Context, sessionID string) (*domain.ExamSession, error)
	GetActiveSessionByExam(ctx context.Context, examID string) (*domain.ExamSession, error)
	ListSessionsByExam(ctx context.Context, examID string) ([]domain.ExamSession, error)
	UpdateSessionStatus(ctx context.Context, sessionID, status string) error

	// ListSessions(ctx context.Context, examID string, activeOnly bool) ([]SessionListItem, error)
	ListSessions(ctx context.Context, examID string, activeOnly bool) ([]domain.SessionListItem, error)
	// Timer & eligibility
	AssignParticipantToSession(ctx context.Context, participantID, sessionID string) error
	GetParticipantSession(ctx context.Context, participantID, examID string) (*domain.ExamSession, error)
	MarkParticipantStarted(ctx context.Context, participantID, sessionID string) error
	MarkParticipantSubmitted(ctx context.Context, participantID, sessionID string) error
}
