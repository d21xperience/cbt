// internal/proctoring/domain/telemetry.go
package domain

type TelemetryEvent struct {
	ParticipantID string `json:"participant_id"`
	ExamID        string `json:"exam_id"`
	EventType     string `json:"event_type"` // HEARTBEAT, TAB_SWITCH, WINDOW_BLUR, FULLSCREEN_EXIT
	Timestamp     int64  `json:"timestamp"`
}

type ProctoringAction struct {
	Action string `json:"action"` // WARN, FORCE_SUBMIT, DISQUALIFY
	Reason string `json:"reason"`
}
