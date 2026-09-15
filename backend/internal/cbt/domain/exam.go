package domain

import (
	"context"
	"time"
)

// ==================== QUESTION ====================

type QuestionType string

const (
	TypePG       QuestionType = "PG"
	TypeEssay    QuestionType = "ESSAY"
	TypeMatching QuestionType = "MATCHING"
	TypeHotspot  QuestionType = "HOTSPOT"
	TypeAudio    QuestionType = "AUDIO"
	TypeCoding   QuestionType = "CODING"
)

type CodingMode string

const (
	CodingModeAnalysis CodingMode = "ANALYSIS"
	CodingModeWriting  CodingMode = "WRITING"
)

type Question struct {
	ID              string       `json:"id"`
	ExamID          string       `json:"exam_id"`
	QuestionText    string       `json:"question_text"`
	MediaURL        string       `json:"media_url,omitempty"`
	Options         string       `json:"options"` // JSON string
	CorrectOption   string       `json:"-"`       // JANGAN kirim ke peserta
	QuestionType    QuestionType `json:"question_type"`
	Score           float64      `json:"score"`
	Rubric          string       `json:"rubric,omitempty"`
	CodingCategory  string       `json:"coding_category,omitempty"`
	ProgrammingLang string       `json:"programming_lang,omitempty"`
	CodingMode      CodingMode   `json:"coding_mode,omitempty"`
	CreatedAt       time.Time    `json:"created_at,omitempty"`
}

// ==================== RESULT ====================

type ExamResult struct {
	ID             int64     `json:"id"`
	ParticipantID  string    `json:"participant_id"`
	ExamID         string    `json:"exam_id"`
	TotalQuestions int       `json:"total_questions"`
	CorrectAnswers int       `json:"correct_answers"`
	FinalScore     float64   `json:"final_score"`
	Status         string    `json:"status"` // SUBMITTED | GRADING_ESSAY | NEEDS_REVIEW | GRADED
	SubmittedAt    time.Time `json:"submitted_at"`
}

// ==================== ANSWER (Redis) ====================

type ParticipantAnswer struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	QuestionID    string `json:"question_id"`
	Answer        string `json:"answer"`
	Timestamp     int64  `json:"timestamp"`
}

type ParticipantStatus struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	Status        string `json:"status"`
	LastPing      int64  `json:"last_ping"`
}

// ==================== GRADING QUEUE ====================

type EssayGradingPayload struct {
	ParticipantID   string  `json:"participant_id"`
	ExamID          string  `json:"exam_id"`
	QuestionID      string  `json:"question_id"`
	QuestionType    string  `json:"question_type"`
	AnswerText      string  `json:"answer_text"`
	Rubric          string  `json:"rubric"`
	MaxScore        float64 `json:"max_score"`
	CodingCategory  string  `json:"coding_category,omitempty"`
	ProgrammingLang string  `json:"programming_lang,omitempty"`
}

// ==================== REDIS INTERFACE ====================

type CbtRedisRepository interface {
	SaveAnswerCache(ctx context.Context, studentID, examID, questionID, answer string) error
	GetAnswersCache(ctx context.Context, studentID, examID string) (map[string]string, error)
	DeleteAnswersCache(ctx context.Context, studentID, examID string) error
}
