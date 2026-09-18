package domain

import "time"

type PaymentGate struct {
	NISN        string     `json:"nisn"`
	IsBlocked   bool       `json:"is_blocked"`
	Reason      string     `json:"reason,omitempty"`
	Source      string     `json:"source"`
	BlockedBy   string     `json:"blocked_by,omitempty"`
	BlockedAt   *time.Time `json:"blocked_at,omitempty"`
	UnblockedBy string     `json:"unblocked_by,omitempty"`
	UnblockedAt *time.Time `json:"unblocked_at,omitempty"`
	Note        string     `json:"note,omitempty"`
}
