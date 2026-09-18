package domain

import "time"

type ProctorAssignment struct {
	ID         string    `json:"id"`
	ProctorID  string    `json:"proctor_id"`
	SessionID  string    `json:"session_id"`
	ClassName  string    `json:"class_name,omitempty"`
	AssignedBy string    `json:"assigned_by,omitempty"`
	AssignedAt time.Time `json:"assigned_at"`
}

// ProctorSessionView — untuk list "sesi yang saya awasi"
type ProctorSessionView struct {
	SessionID    string `json:"session_id"`
	ExamID       string `json:"exam_id"`
	ExamTitle    string `json:"exam_title"`
	SessionType  string `json:"session_type"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	Status       string `json:"status"`
	ClassName    string `json:"class_name,omitempty"`
	StudentCount int    `json:"student_count"`
}
