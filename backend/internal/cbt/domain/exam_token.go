package domain

import "time"

type ExamToken struct {
	ID          string    `json:"id"`
	SessionID   string    `json:"session_id"`
	Token       string    `json:"token"`
	ValidFrom   time.Time `json:"valid_from"`
	ValidUntil  time.Time `json:"valid_until"`
	IsActive    bool      `json:"is_active"`
	GeneratedBy string    `json:"generated_by,omitempty"`
	GeneratedAt time.Time `json:"generated_at"`
}

func (t *ExamToken) IsValidAt(now time.Time) bool {
	return t.IsActive && !now.Before(t.ValidFrom) && now.Before(t.ValidUntil)
}

// Config default
const (
	DefaultTokenRotationMinutes = 30
	TokenRotationGraceMinutes   = 2 // tolerance
)
