package domain

import "time"

type SessionType string

const (
	SessionReguler SessionType = "REGULER"
	SessionSusulan SessionType = "SUSULAN"
)

// ExamSession — source of truth untuk waktu ujian
type ExamSession struct {
	ID          string      `json:"id"`
	ExamID      string      `json:"exam_id"`
	SemesterID  string      `json:"semester_id"`
	SessionType SessionType `json:"session_type"`
	StartTime   time.Time   `json:"start_time"`
	EndTime     time.Time   `json:"end_time"`
	Status      string      `json:"status"` // SCHEDULED | ACTIVE | CLOSED
	CreatedAt   time.Time   `json:"created_at"`
}

// ExamStatus — status ujian dari sudut pandang peserta (server-derived)
type ExamStatus string

const (
	ExamNotStarted ExamStatus = "NOT_STARTED"
	ExamActive     ExamStatus = "ACTIVE"
	ExamExpired    ExamStatus = "EXPIRED"
	ExamSubmitted  ExamStatus = "SUBMITTED"
)

// DeriveStatus — hitung status ujian berdasar waktu server + submission state
func (s *ExamSession) DeriveStatus(now time.Time, alreadySubmitted bool) ExamStatus {
	if alreadySubmitted {
		return ExamSubmitted
	}
	if now.Before(s.StartTime) {
		return ExamNotStarted
	}
	if now.After(s.EndTime) {
		return ExamExpired
	}
	return ExamActive
}

func (s *ExamSession) RemainingSeconds(now time.Time) int64 {
	if now.After(s.EndTime) {
		return 0
	}
	return int64(s.EndTime.Sub(now).Seconds())
}

// AnswerBatchItem — satu jawaban dalam batch
type AnswerBatchItem struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
	ClientSeq  int64  `json:"client_seq,omitempty"` // untuk idempotency & ordering
}

// AnswerBatchRequest — payload endpoint /exam/answers/batch
type AnswerBatchRequest struct {
	IdempotencyKey string            `json:"idempotency_key"`
	Answers        []AnswerBatchItem `json:"answers"`
}

// TimerResponse — payload endpoint /exam/timer
type TimerResponse struct {
	Status           ExamStatus `json:"status"`
	RemainingSeconds int64      `json:"remaining_seconds"`
	ServerTime       int64      `json:"server_time"`
	SessionID        string     `json:"session_id,omitempty"`
}

// SessionListItem — DTO untuk proctor panel
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
