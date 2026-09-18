package domain

// DashboardResponse — struktur response dashboard peserta
type DashboardResponse struct {
	Scheduled []DashboardExamItem `json:"scheduled"`
	Makeup    []DashboardExamItem `json:"makeup_available"`
	Completed []CompletedExamItem `json:"completed"`
}

type DashboardExamItem struct {
	ExamID        string `json:"exam_id"`
	SessionID     string `json:"session_id"`
	Title         string `json:"title"`
	SessionType   string `json:"session_type"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	SessionStatus string `json:"session_status"` // NOT_STARTED | ACTIVE | EXPIRED | CLOSED
	IsMakeup      bool   `json:"is_makeup"`
	MakeupReason  string `json:"makeup_reason,omitempty"`
	Blocked       bool   `json:"blocked"`
	BlockedReason string `json:"blocked_reason,omitempty"`
}

type CompletedExamItem struct {
	ExamID         string  `json:"exam_id"`
	Title          string  `json:"title"`
	TotalQuestions int     `json:"total_questions"`
	CorrectAnswers int     `json:"correct_answers"`
	FinalScore     float64 `json:"final_score"`
	Status         string  `json:"status"`
	SubmittedAt    string  `json:"submitted_at"`
}
